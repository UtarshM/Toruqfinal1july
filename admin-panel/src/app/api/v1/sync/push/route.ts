import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import prisma from '@/lib/prisma'

interface SyncMutation {
  idempotencyKey: string
  entityType: 'call' | 'lead' | 'followup'
  entityId?: string
  action: 'create' | 'update' | 'delete'
  payload: any
  clientVersion?: number
}

/**
 * POST /api/v1/sync/push
 * Processes a batch of offline mutations queued by mobile SQLite clients.
 * Guarantees idempotency and transactional safety.
 */
export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const body = await req.json()
    const mutations: SyncMutation[] = body.mutations || []

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return apiSuccess({ applied: [], rejected: [], processedCount: 0 })
    }

    const currentUserId = context.userId
    const applied: string[] = []
    const rejected: Array<{ idempotencyKey: string; reason: string }> = []

    for (const mut of mutations) {
      if (!mut.idempotencyKey) {
        rejected.push({ idempotencyKey: 'UNKNOWN', reason: 'Missing idempotencyKey' })
        continue
      }

      // Check if already applied
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: { key: mut.idempotencyKey }
      })

      if (existingKey) {
        applied.push(mut.idempotencyKey)
        continue
      }

      try {
        await prisma.$transaction(async (tx) => {
          if (mut.entityType === 'call' && mut.action === 'create') {
            const leadId = mut.payload.leadId || mut.payload.lead_id
            const outcome = mut.payload.outcome
            const notes = mut.payload.notes || mut.payload.remark || null
            const duration = mut.payload.duration ? Number(mut.payload.duration) : null

            const call = await tx.call.create({
              data: {
                leadId,
                userId: currentUserId,
                type: mut.payload.type || 'outbound',
                outcome,
                duration,
                notes
              }
            })

            // Auto-update lead
            await tx.lead.updateMany({
              where: { id: leadId, status: 'New' },
              data: { status: 'Contacted', updatedAt: new Date() }
            })

            // Check if response triggers follow up
            const predefined = await tx.predefinedResponse.findFirst({
              where: { text: outcome, isActive: true }
            })

            if (predefined?.requiresFollowUp) {
              const days = predefined.followupDays > 0 ? predefined.followupDays : 2
              const scheduledAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
              await tx.followUp.create({
                data: {
                  leadId,
                  assignedTo: currentUserId,
                  type: 'call',
                  scheduledAt,
                  notes: `Auto-created from offline call outcome: ${outcome}`,
                  status: 'pending'
                }
              })
            }

            // Sync event
            await tx.syncEvent.create({
              data: {
                entityType: 'call',
                entityId: call.id,
                action: 'create',
                payload: { id: call.id, leadId, outcome, notes },
                userId: currentUserId
              }
            })
          } else if (mut.entityType === 'lead' && mut.action === 'update') {
            const leadId = mut.entityId || mut.payload.id
            if (!leadId) throw new Error('Missing lead ID')

            const existingLead = await tx.lead.findUnique({
              where: { id: leadId },
              select: { id: true, updatedAt: true, status: true }
            })
            if (!existingLead) throw new Error('Lead not found')

            if (mut.payload.updatedAt) {
              const clientTime = new Date(mut.payload.updatedAt).getTime()
              const serverTime = new Date(existingLead.updatedAt).getTime()
              if (serverTime - clientTime > 1000) {
                throw new Error('CONFLICT: Lead was modified on server after client read')
              }
            }

            const updateData: any = { updatedAt: new Date() }
            if (mut.payload.status) updateData.status = mut.payload.status

            await tx.lead.update({
              where: { id: leadId },
              data: updateData
            })

            await tx.syncEvent.create({
              data: {
                entityType: 'lead',
                entityId: leadId,
                action: 'update',
                payload: updateData,
                userId: currentUserId
              }
            })
          } else if (mut.entityType === 'followup' && mut.action === 'update') {
            const followupId = mut.entityId || mut.payload.id
            if (!followupId) throw new Error('Missing followup ID')

            const updateData: any = { updatedAt: new Date() }
            if (mut.payload.status) updateData.status = mut.payload.status
            if (mut.payload.notes) updateData.notes = mut.payload.notes

            await tx.followUp.update({
              where: { id: followupId },
              data: updateData
            })

            await tx.syncEvent.create({
              data: {
                entityType: 'followup',
                entityId: followupId,
                action: 'update',
                payload: updateData,
                userId: currentUserId
              }
            })
          }

          // Record Idempotency
          await tx.idempotencyKey.create({
            data: {
              key: mut.idempotencyKey,
              handler: `sync.push.${mut.entityType}`,
              responseStatus: 200,
              responseBody: { success: true },
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          })
        })

        applied.push(mut.idempotencyKey)
      } catch (mutationErr: any) {
        console.error(`[SyncPush] Mutation failed for ${mut.idempotencyKey}:`, mutationErr)
        rejected.push({
          idempotencyKey: mut.idempotencyKey,
          reason: mutationErr.message || 'Mutation transaction failed'
        })
      }
    }

    return apiSuccess({
      applied,
      rejected,
      appliedCount: applied.length,
      rejectedCount: rejected.length
    })
  } catch (err: any) {
    console.error('[SyncPush] Server Error:', err)
    return apiError(err.message || 'Failed to process sync push', 'INTERNAL_ERROR', 500, null, req)
  }
}
