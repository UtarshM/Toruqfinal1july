import { NextRequest } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { apiSuccess, apiError } from '@/lib/api-response'
import prisma from '@/lib/prisma'

/**
 * GET /api/v1/sync/pull
 * Cursor-based change feed synchronization endpoint.
 * Query params:
 * - cursor: Sequence number of the last synced event (defaults to 0)
 * - limit: Max number of events to return (defaults to 100, max 200)
 */
export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req)
  if (error || !context) {
    return apiError('Unauthorized', 'UNAUTHORIZED', 401, null, req)
  }

  try {
    const { searchParams } = new URL(req.url)
    const cursorStr = searchParams.get('cursor') || '0'
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 100), 200)

    let cursorBigInt: bigint
    try {
      cursorBigInt = BigInt(cursorStr)
    } catch {
      cursorBigInt = BigInt(0)
    }

    const currentUserId = context.userId
    const userRole = context.role || ''
    const isAdmin = ['admin', 'super_admin', 'Admin', 'Super Admin'].includes(userRole)

    // Admin receives all sync events. Regular users receive broadcast events (userId == null)
    // or events specifically targeting them.
    const userFilter: any = isAdmin
      ? {}
      : {
          OR: [
            { userId: null },
            { userId: currentUserId }
          ]
        }

    const events = await prisma.syncEvent.findMany({
      where: {
        sequence: { gt: cursorBigInt },
        ...userFilter
      },
      orderBy: { sequence: 'asc' },
      take: limit + 1
    })

    const hasMore = events.length > limit
    const returnedEvents = hasMore ? events.slice(0, limit) : events

    const nextCursor = returnedEvents.length > 0
      ? returnedEvents[returnedEvents.length - 1].sequence.toString()
      : cursorStr

    const formattedEvents = returnedEvents.map(e => ({
      sequence: e.sequence.toString(),
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      payload: e.payload,
      createdAt: e.createdAt.toISOString()
    }))

    return apiSuccess({
      changes: formattedEvents,
      nextCursor,
      hasMore,
      count: formattedEvents.length
    })
  } catch (err: any) {
    console.error('[SyncPull] Error:', err)
    return apiError(err.message || 'Failed to pull sync feed', 'INTERNAL_ERROR', 500, null, req)
  }
}
