/**
 * src/lib/sync-helper.ts
 * Emits change-feed events to the `sync_events` table for cursor-based mobile synchronization.
 */

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type SyncEntityType = 'lead' | 'call' | 'followup' | 'document' | 'response' | 'assignment'
export type SyncAction = 'create' | 'update' | 'delete'

export interface SyncEventPayload {
  entityType: SyncEntityType
  entityId: string
  action: SyncAction
  payload: any
  userId?: string | null
}

export async function recordSyncEvent(
  event: SyncEventPayload,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma
  try {
    await client.syncEvent.create({
      data: {
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        payload: event.payload || {},
        userId: event.userId || null
      }
    })
  } catch (err) {
    console.error('[SyncEvent] Failed to record sync event:', err)
  }
}

export async function recordBulkSyncEvents(
  events: SyncEventPayload[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (events.length === 0) return
  const client = tx || prisma
  try {
    await client.syncEvent.createMany({
      data: events.map(e => ({
        entityType: e.entityType,
        entityId: e.entityId,
        action: e.action,
        payload: e.payload || {},
        userId: e.userId || null
      }))
    })
  } catch (err) {
    console.error('[SyncEvent] Failed to record bulk sync events:', err)
  }
}
