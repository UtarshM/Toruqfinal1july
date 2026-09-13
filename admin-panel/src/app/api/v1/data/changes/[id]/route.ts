import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'

// PATCH /api/v1/data/changes/[id] — approve or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleUpper = (context.role || '').toUpperCase()
  const canApprove = roleUpper.includes('ADMIN') || roleUpper.includes('SUPER') || context.permissions.includes('data.approve_changes')
  if (!canApprove) {
    return NextResponse.json({ error: 'Forbidden: Missing permission to approve or reject data changes' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { action, reviewNote, assignedTo } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const changeReq = await prisma.dataChangeRequest.findUnique({
      where: { id },
      include: { requester: { select: { fullName: true } } }
    })

    if (!changeReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (changeReq.status !== 'pending') {
      return NextResponse.json({ error: 'Request already reviewed' }, { status: 400 })
    }

    const updated = await prisma.dataChangeRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: context.userId,
        reviewNote: reviewNote || null,
        reviewedAt: new Date()
      }
    })

    if (action === 'approve') {
      await applyChange(changeReq.entityType, changeReq.entityId, changeReq.field, changeReq.newValue, assignedTo)
      logActivity(context.userId, 'change_approved', changeReq.entityType, changeReq.entityId, {
        field: changeReq.field, newValue: changeReq.newValue, assignedTo
      })
    } else {
      // Rejection handling: If it was an agent approval request, clear agent tag if lead exists
      if (changeReq.entityType.toLowerCase() === 'lead' && changeReq.field === 'existingAgent') {
        const lead = await prisma.lead.findUnique({ where: { id: changeReq.entityId } }).catch(() => null)
        if (lead) {
          let newAssignee = lead.assignedTo
          if (!newAssignee) {
            const salesExecutives = await prisma.user.findMany({
              where: {
                isActive: true,
                role: {
                  OR: [
                    { name: { equals: 'Sales Executive', mode: 'insensitive' } },
                    { name: { equals: 'EXECUTIVE', mode: 'insensitive' } }
                  ]
                }
              },
              orderBy: { createdAt: 'asc' },
              select: { id: true }
            })
            if (salesExecutives.length > 0) {
              newAssignee = salesExecutives[0].id
            }
          }

          await prisma.lead.update({
            where: { id: lead.id },
            data: { existingAgent: null, assignedTo: newAssignee }
          }).catch(() => {})
        }
      }
    }

    await notify({
      userId: changeReq.requestedBy,
      title: action === 'approve' ? '✅ Change Approved' : '❌ Change Rejected',
      body: `Your request to change "${changeReq.field}" has been ${action === 'approve' ? 'approved' : 'rejected'}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      type: action === 'approve' ? 'success' : 'error',
      entityType: 'DataChangeRequest',
      entityId: id
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[data/changes PATCH] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to review request' }, { status: 500 })
  }
}

/**
 * Applies the approved change to the actual database entity safely.
 */
async function applyChange(entityType: string, entityId: string, field: string, newValue: string, assignedTo?: string | null) {
  const update: any = { [field]: newValue }
  try {
    switch (entityType.toLowerCase()) {
      case 'lead': {
        const lead = await prisma.lead.findUnique({ where: { id: entityId } }).catch(() => null)
        if (!lead) {
          console.warn(`[DataChange] Target lead ${entityId} not found in database (may be archived).`)
          return
        }

        if (field === 'existingAgent' && newValue === 'Agent') {
          const finalAssignee = assignedTo !== undefined ? assignedTo : null
          await prisma.lead.update({
            where: { id: entityId },
            data: { existingAgent: 'Agent', assignedTo: finalAssignee }
          }).catch(() => {})

          if (lead.clientPhone) {
            await prisma.lead.updateMany({
              where: { clientPhone: lead.clientPhone },
              data: { existingAgent: 'Agent', assignedTo: finalAssignee }
            }).catch(() => {})
          }
        } else {
          if (assignedTo !== undefined) update.assignedTo = assignedTo
          await prisma.lead.update({ where: { id: entityId }, data: update }).catch(() => {})
        }
        break
      }
      case 'customer':
        await prisma.customer.update({ where: { id: entityId }, data: update }).catch(() => {})
        break
      case 'policy':
        await prisma.policy.update({ where: { id: entityId }, data: update }).catch(() => {})
        break
      case 'claim':
        await prisma.claim.update({ where: { id: entityId }, data: update }).catch(() => {})
        break
      default:
        console.warn(`[DataChange] No auto-apply handler for entity type: ${entityType}`)
    }
  } catch (err) {
    console.error('[DataChange] Failed to apply change:', err)
  }
}
