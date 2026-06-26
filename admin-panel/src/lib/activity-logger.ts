import prisma from './prisma'

/**
 * Fire-and-forget activity logger.
 * Does NOT await — will not block the request.
 */
export function logActivity(
  userId: string | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  prisma.activityLog.create({
    data: {
      userId: userId || undefined,
      action,
      entityType,
      entityId,
      metadata: metadata || undefined
    }
  }).catch(err => {
    // Never crash the request over a logging failure
    console.error('[ActivityLogger] Failed to log activity:', err?.message)
  })
}
