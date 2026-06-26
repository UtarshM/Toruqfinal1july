import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'

// PATCH /api/v1/data/changes/[id] — approve or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req, 'data.approve_changes')
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const { action, reviewNote } = body // action: 'approve' | 'reject'

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
      reviewedBy: context!.userId,
      reviewNote: reviewNote || null,
      reviewedAt: new Date()
    }
  })

  if (action === 'approve') {
    await applyChange(changeReq.entityType, changeReq.entityId, changeReq.field, changeReq.newValue)
    logActivity(context!.userId, 'change_approved', changeReq.entityType, changeReq.entityId, {
      field: changeReq.field, newValue: changeReq.newValue
    })
  }

  await notify({
    userId: changeReq.requestedBy,
    title: action === 'approve' ? '✅ Change Approved' : '❌ Change Rejected',
    body: `Your request to change "${changeReq.field}" has been ${action === 'approve' ? 'approved' : 'rejected'}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    type: action === 'approve' ? 'success' : 'error',
    entityType: 'DataChangeRequest',
    entityId: id
  })

  return NextResponse.json(updated)
}

/**
 * Applies the approved change to the actual database entity.
 */
async function applyChange(entityType: string, entityId: string, field: string, newValue: string) {
  const update = { [field]: newValue }
  try {
    switch (entityType.toLowerCase()) {
      case 'lead':
        await prisma.lead.update({ where: { id: entityId }, data: update })
        break
      case 'customer':
        await prisma.customer.update({ where: { id: entityId }, data: update })
        break
      case 'policy':
        await prisma.policy.update({ where: { id: entityId }, data: update })
        break
      case 'claim':
        await prisma.claim.update({ where: { id: entityId }, data: update })
        break
      default:
        console.warn(`[DataChange] No auto-apply handler for entity type: ${entityType}`)
    }
  } catch (err) {
    console.error('[DataChange] Failed to apply change:', err)
  }
}
