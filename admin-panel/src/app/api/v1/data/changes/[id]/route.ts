import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import prisma from '@/lib/prisma'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'
import { syncSpreadsheetForBatch } from '@/lib/spreadsheet-sync'
import { apiSuccess, apiError } from '@/lib/api-response'
import { recordSyncEvent } from '@/lib/sync-helper'
import { normalizeVehicleNo } from '@/lib/vehicle-helper'

// PATCH /api/v1/data/changes/[id] — approve or reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req, 'data.approve_changes')
  if (error || !context) {
    return apiError('Unauthorized to review data changes', 'UNAUTHORIZED', 401, null, req)
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { action, reviewNote, assignedTo } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return apiError('Action must be either "approve" or "reject"', 'VALIDATION_ERROR', 400, null, req)
    }

    const changeReq = await prisma.dataChangeRequest.findUnique({
      where: { id },
      include: { requester: { select: { fullName: true } } }
    })

    if (!changeReq) {
      return apiError('Data change request not found', 'NOT_FOUND', 404, null, req)
    }
    if (changeReq.status !== 'pending') {
      return apiError('This request has already been reviewed', 'CONFLICT', 409, null, req)
    }

    const isApproved = action === 'approve'

    const updated = await prisma.dataChangeRequest.update({
      where: { id },
      data: {
        status: isApproved ? 'approved' : 'rejected',
        reviewedBy: context.userId,
        reviewNote: reviewNote || null,
        reviewedAt: new Date()
      }
    })

    if (isApproved) {
      await applyChange(changeReq.entityType, changeReq.entityId, changeReq.field, changeReq.newValue, assignedTo)
      logActivity(context.userId, 'change_approved', changeReq.entityType, changeReq.entityId, {
        field: changeReq.field,
        oldValue: changeReq.oldValue,
        newValue: changeReq.newValue,
        assignedTo
      })
    } else {
      logActivity(context.userId, 'change_rejected', changeReq.entityType, changeReq.entityId, {
        field: changeReq.field,
        oldValue: changeReq.oldValue,
        attemptedValue: changeReq.newValue,
        reviewNote
      })

      // Rejection handling: If it was an agent approval request, clear agent tag
      if (changeReq.entityType.toLowerCase() === 'lead' && changeReq.field === 'existingAgent') {
        const lead = await prisma.lead.findUnique({ where: { id: changeReq.entityId } })
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
            data: { existingAgent: null, assignedTo: newAssignee, updatedAt: new Date() }
          })

          await recordSyncEvent({
            entityType: 'lead',
            entityId: lead.id,
            action: 'update',
            payload: { existingAgent: null, assignedTo: newAssignee },
            userId: newAssignee
          })

          await syncSpreadsheetForBatch(lead.importName)
          await syncSpreadsheetForBatch('all_leads')
        }
      }
    }

    // Notify requester
    await notify({
      userId: changeReq.requestedBy,
      title: isApproved ? '✅ Change Approved' : '❌ Change Rejected',
      body: `Your request to change "${changeReq.field}" has been ${isApproved ? 'approved' : 'rejected'}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      type: isApproved ? 'success' : 'error',
      entityType: 'DataChangeRequest',
      entityId: id
    }).catch(() => {})

    return apiSuccess(updated)
  } catch (err: any) {
    console.error('Data change approval error:', err)
    return apiError(err.message || 'Internal Server Error', 'INTERNAL_ERROR', 500, null, req)
  }
}

/**
 * Applies the approved change to the actual database entity and emits a sync event.
 */
async function applyChange(
  entityType: string,
  entityId: string,
  field: string,
  newValue: string,
  assignedTo?: string | null
) {
  const update: any = { [field]: newValue, updatedAt: new Date() }

  try {
    switch (entityType.toLowerCase()) {
      case 'lead': {
        if (field === 'vehicleNo') {
          update.vehicleNoNormalized = normalizeVehicleNo(newValue)
        }

        if (field === 'existingAgent' && newValue === 'Agent') {
          const lead = await prisma.lead.findUnique({ where: { id: entityId } })
          if (lead) {
            const finalAssignee = assignedTo !== undefined ? assignedTo : null
            await prisma.lead.update({
              where: { id: entityId },
              data: { existingAgent: 'Agent', assignedTo: finalAssignee, updatedAt: new Date() }
            })

            if (lead.clientPhone) {
              await prisma.lead.updateMany({
                where: { clientPhone: lead.clientPhone },
                data: { existingAgent: 'Agent', assignedTo: finalAssignee, updatedAt: new Date() }
              })
            }

            await syncSpreadsheetForBatch(lead.importName)
            await syncSpreadsheetForBatch('all_leads')
          }
        } else {
          if (assignedTo !== undefined) update.assignedTo = assignedTo
          await prisma.lead.update({ where: { id: entityId }, data: update })
        }

        // Emit sync event for mobile clients
        await recordSyncEvent({
          entityType: 'lead',
          entityId,
          action: 'update',
          payload: update,
          userId: assignedTo || null
        })
        break
      }
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
