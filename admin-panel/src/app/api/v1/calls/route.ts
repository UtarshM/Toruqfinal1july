import { validateAuth } from '@/lib/auth-guard'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

/**
 * POST /api/v1/calls
 * Records a call outcome, manages idempotent follow-up generation, creates notifications,
 * and emits sync events for offline mobile clients.
 */
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) {
    return apiError('Unauthorized to log calls', 'UNAUTHORIZED', 401, null, req)
  }

  // Permissions: crm.create, crm.manage_followups, leads.edit, or lead.edit
  const hasPermission = context.permissions.some(p =>
    ['crm.create', 'crm.manage_followups', 'leads.edit', 'lead.edit'].includes(p)
  )
  if (!hasPermission) {
    return apiError('Forbidden: Missing permission to log calls', 'FORBIDDEN', 403, null, req)
  }

  try {
    const body = await req.json()
    const leadId = body.leadId || body.lead_id
    const userId = body.userId || body.user_id || context.userId
    const outcome = body.outcome?.trim()
    const notes = body.notes || body.remark || body.remarks || null
    const duration = body.duration ? Number(body.duration) : null
    const type = body.type || 'outbound'
    const idempotencyKey = body.idempotencyKey || req.headers.get('x-idempotency-key')

    if (!leadId || !outcome) {
      return apiError('leadId and outcome are required', 'VALIDATION_ERROR', 400, null, req)
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
      })
      if (existingKey) {
        return apiSuccess(existingKey.responseBody)
      }
    }

    // 2. Fetch Lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, clientName: true, status: true, assignedTo: true }
    })
    if (!lead) {
      return apiError('Lead not found', 'NOT_FOUND', 404, null, req)
    }

    // 3. Check Predefined Response Configuration
    const predefined = await prisma.predefinedResponse.findFirst({
      where: {
        text: outcome,
        isActive: true
      }
    })

    // Execute in transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // A. Create the call log
      const call = await tx.call.create({
        data: {
          leadId,
          userId,
          type,
          outcome,
          duration,
          notes
        }
      })

      // B. Update lead status if New
      let newLeadStatus = lead.status
      if (lead.status === 'New') {
        newLeadStatus = 'Contacted'
        await tx.lead.update({
          where: { id: leadId },
          data: { status: newLeadStatus, updatedAt: new Date() }
        })
      }

      // C. Follow-up generation if configured
      let createdFollowUp = null
      const shouldCreateFollowUp = predefined?.requiresFollowUp || body.requiresFollowUp || false

      if (shouldCreateFollowUp) {
        const followupDays = predefined?.followupDays && predefined.followupDays > 0 ? predefined.followupDays : 2
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + followupDays * 24 * 60 * 60 * 1000)

        // Check for existing pending followup today to ensure idempotency
        const existingFollowUp = await tx.followUp.findFirst({
          where: {
            leadId,
            status: 'pending',
            scheduledAt: {
              gte: new Date(scheduledAt.setHours(0, 0, 0, 0)),
              lte: new Date(scheduledAt.setHours(23, 59, 59, 999))
            }
          }
        })

        if (!existingFollowUp) {
          createdFollowUp = await tx.followUp.create({
            data: {
              leadId,
              assignedTo: lead.assignedTo || userId,
              leadName: lead.clientName,
              type: 'call',
              scheduledAt,
              notes: notes ? `Auto-generated from call outcome: ${outcome}. Remark: ${notes}` : `Auto-generated from call outcome: ${outcome}`,
              status: 'pending'
            }
          })

          // In-app Notification for assigned executive
          const notifyUserId = lead.assignedTo || userId
          await tx.notification.create({
            data: {
              userId: notifyUserId,
              title: `Follow-up Scheduled: ${lead.clientName}`,
              body: `Follow-up set for ${scheduledAt.toLocaleDateString()} (${outcome})`,
              type: 'followup',
              entityType: 'followup',
              entityId: createdFollowUp.id,
              data: { leadId, outcome, scheduledAt: scheduledAt.toISOString() }
            }
          })
        }
      }

      // D. Activity Log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'logged_call',
          entityType: 'lead',
          entityId: leadId,
          metadata: { outcome, notes, followUpCreated: !!createdFollowUp }
        }
      })

      // E. Sync Events for Offline-First Mobile Synchronization
      await tx.syncEvent.create({
        data: {
          entityType: 'call',
          entityId: call.id,
          action: 'create',
          payload: {
            id: call.id,
            leadId,
            userId,
            outcome,
            duration,
            notes,
            createdAt: call.createdAt
          },
          userId
        }
      })

      if (newLeadStatus !== lead.status) {
        await tx.syncEvent.create({
          data: {
            entityType: 'lead',
            entityId: leadId,
            action: 'update',
            payload: { status: newLeadStatus },
            userId
          }
        })
      }

      if (createdFollowUp) {
        await tx.syncEvent.create({
          data: {
            entityType: 'followup',
            entityId: createdFollowUp.id,
            action: 'create',
            payload: createdFollowUp,
            userId: createdFollowUp.assignedTo
          }
        })
      }

      return {
        call,
        leadStatus: newLeadStatus,
        followUp: createdFollowUp
      }
    })

    // Store idempotency key if provided
    if (idempotencyKey) {
      await prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          handler: 'calls.create',
          responseStatus: 200,
          responseBody: transactionResult as any,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }).catch(() => {})
    }

    return apiSuccess(transactionResult)
  } catch (error: any) {
    console.error('Call POST Error:', error)
    return apiError(error.message || 'Internal Server Error', 'INTERNAL_ERROR', 500, null, req)
  }
}

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'crm.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('leadId') || searchParams.get('lead_id')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    const where: any = {}
    if (leadId) where.leadId = leadId

    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        lead: { select: { clientName: true, vehicleNo: true } },
        user: { select: { fullName: true } }
      }
    })

    return apiSuccess(calls)
  } catch (error: any) {
    console.error('Calls GET Error:', error)
    return apiError(error.message || 'Internal Server Error', 'INTERNAL_ERROR', 500, null, req)
  }
}
