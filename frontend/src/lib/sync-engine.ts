/**
 * src/lib/sync-engine.ts
 * Robust Client-Side Synchronization Engine for Torque Auto Advisors.
 * 
 * Implements:
 * 1. Cursor/Change-Feed pull protocol (GET /api/v1/sync/pull?cursor=...)
 * 2. Idempotent Offline mutation push queue (POST /api/v1/sync/push)
 * 3. Local SQLite optimistic mutation logging (Phase 11)
 * 4. Deletions & Tombstones (Phase 13)
 * 5. AppState resume & reconnect background triggers (Phase 14)
 * 6. Sync state subscription for UI badges (Phase 34, 35)
 */

import { AppState, AppStateStatus } from 'react-native';
import { api } from './api';
import {
  getSyncMetadata,
  setSyncMetadata,
  enqueueOfflineMutation,
  getPendingMutations,
  markMutationSynced,
  markMutationFailed,
  upsertLocalLead,
  insertLocalCall,
  upsertLocalFollowup,
  updateLocalLeadOutcome,
  getDB,
  OfflineMutation
} from './db';

const SYNC_CURSOR_KEY = 'lastSyncCursor';
const LAST_SYNC_TIME_KEY = 'lastSyncTimestamp';

export type SyncStateMode = 'synced' | 'syncing' | 'pending' | 'failed';

export interface SyncState {
  status: SyncStateMode;
  pendingCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

let currentSyncState: SyncState = {
  status: 'synced',
  pendingCount: 0,
  lastSyncTime: null,
  lastError: null
};

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

function notifyStateChange(update: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...update };
  listeners.forEach(l => l(currentSyncState));
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentSyncState);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return currentSyncState;
}

export interface SyncStats {
  pulledCount: number;
  pushedCount: number;
  failedCount: number;
  lastSyncCursor: string;
}

/**
 * Pulls change events from the server since the last cursor.
 */
export async function pullSync(): Promise<number> {
  let totalPulled = 0;
  let hasMore = true;

  while (hasMore) {
    const lastCursor = (await getSyncMetadata(SYNC_CURSOR_KEY)) || '0';
    const res = await api.get('/sync/pull', {
      params: { cursor: lastCursor, limit: 100 }
    });

    const body = res.data?.data || res.data;
    const changes = body?.changes || [];
    const nextCursor = body?.nextCursor;
    hasMore = !!body?.hasMore;

    if (changes.length === 0) {
      break;
    }

    const db = await getDB();
    for (const change of changes) {
      const { entityType, action, payload } = change;

      if (entityType === 'lead') {
        if (action === 'delete') {
          // Phase 13: Tombstone handling — remove from local SQLite
          await db.runAsync('DELETE FROM local_leads WHERE id = ?', [change.entityId]);
        } else {
          await upsertLocalLead({ id: change.entityId, ...payload });
        }
      } else if (entityType === 'call') {
        await insertLocalCall({ id: change.entityId, ...payload });
      } else if (entityType === 'followup') {
        if (action === 'delete') {
          await db.runAsync('DELETE FROM local_followups WHERE id = ?', [change.entityId]);
        } else {
          await db.runAsync(
            `INSERT OR REPLACE INTO local_followups (id, lead_id, assigned_to, lead_name, scheduled_at, status, notes, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              change.entityId,
              payload.leadId || payload.lead_id,
              payload.assignedTo || payload.assigned_to || null,
              payload.leadName || payload.lead_name || null,
              payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : new Date().toISOString(),
              payload.status || 'pending',
              payload.notes || null,
              new Date().toISOString()
            ]
          );
        }
      } else if (entityType === 'response') {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_responses (id, text, category, requires_followup, followup_days, is_active, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            change.entityId,
            payload.text,
            payload.category || 'General',
            payload.requiresFollowUp ? 1 : 0,
            payload.followupDays || 0,
            payload.isActive ? 1 : 0,
            payload.orderIndex || 0
          ]
        );
      }
      totalPulled++;
    }

    if (nextCursor) {
      await setSyncMetadata(SYNC_CURSOR_KEY, nextCursor);
    }
  }

  const now = Date.now();
  await setSyncMetadata(LAST_SYNC_TIME_KEY, now.toString());
  notifyStateChange({ lastSyncTime: now });
  return totalPulled;
}

/**
 * Pushes queued local mutations to the server in a batch.
 */
export async function pushSync(): Promise<{ pushedCount: number; failedCount: number }> {
  const pending = await getPendingMutations();
  notifyStateChange({ pendingCount: pending.length });

  if (pending.length === 0) {
    return { pushedCount: 0, failedCount: 0 };
  }

  const mutationsPayload = pending.map(p => ({
    idempotencyKey: p.idempotencyKey,
    entityType: p.entityType,
    entityId: p.entityId,
    action: p.action,
    payload: p.payload,
    clientVersion: 1
  }));

  try {
    const res = await api.post('/sync/push', { mutations: mutationsPayload });
    const body = res.data?.data || res.data;
    const applied: string[] = body?.applied || [];
    const rejected: Array<{ idempotencyKey: string; reason: string }> = body?.rejected || [];

    for (const key of applied) {
      await markMutationSynced(key);
    }

    for (const r of rejected) {
      await markMutationFailed(r.idempotencyKey, r.reason);
    }

    const remainingPending = await getPendingMutations();
    notifyStateChange({
      pendingCount: remainingPending.length,
      lastError: rejected.length > 0 ? rejected[0].reason : null
    });

    return {
      pushedCount: applied.length,
      failedCount: rejected.length
    };
  } catch (err: any) {
    console.error('[SyncEngine] Failed to push mutations:', err);
    notifyStateChange({
      lastError: err.message || 'Sync push failed'
    });
    return { pushedCount: 0, failedCount: pending.length };
  }
}

/**
 * Full bidirectional synchronization (Push then Pull).
 */
export async function syncAll(): Promise<SyncStats> {
  notifyStateChange({ status: 'syncing' });

  try {
    const pushRes = await pushSync();
    const pulledCount = await pullSync();
    const cursor = (await getSyncMetadata(SYNC_CURSOR_KEY)) || '0';

    const hasFailed = pushRes.failedCount > 0;
    const pending = await getPendingMutations();

    notifyStateChange({
      status: hasFailed ? 'failed' : pending.length > 0 ? 'pending' : 'synced',
      pendingCount: pending.length,
      lastError: hasFailed ? 'Some mutations could not be synced' : null
    });

    return {
      pulledCount,
      pushedCount: pushRes.pushedCount,
      failedCount: pushRes.failedCount,
      lastSyncCursor: cursor
    };
  } catch (err: any) {
    console.error('[SyncEngine] syncAll failed:', err);
    notifyStateChange({
      status: 'failed',
      lastError: err.message || 'Network sync error'
    });
    return {
      pulledCount: 0,
      pushedCount: 0,
      failedCount: 1,
      lastSyncCursor: '0'
    };
  }
}

/**
 * Resets failed mutations back to pending and triggers sync.
 */
export async function retryFailedMutations(): Promise<void> {
  const db = await getDB();
  await db.runAsync("UPDATE local_sync_queue SET status = 'pending' WHERE status = 'failed'");
  await syncAll();
}

/**
 * Phase 11 — Offline Mutation Flow: Log a Call
 */
export async function logCallOffline(params: {
  leadId: string;
  userId: string;
  outcome: string;
  notes?: string;
  customNotes?: string;
  newExpiryDate?: string;
  followupDate?: string;
  duration?: number;
}): Promise<{ callId: string; idempotencyKey: string }> {
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const idempotencyKey = `idemp_call_${callId}_${Date.now()}`;
  const effectiveNotes = params.customNotes 
    ? (params.notes ? `${params.notes} | ${params.customNotes}` : params.customNotes)
    : (params.notes || '');

  // 1. Write to local SQLite calls table
  await insertLocalCall({
    id: callId,
    leadId: params.leadId,
    userId: params.userId,
    type: 'outbound',
    outcome: params.outcome,
    duration: params.duration,
    notes: effectiveNotes,
    createdAt: new Date().toISOString()
  });

  // 2. Optimistically update local lead status, remarks & newExpiryDate
  try {
    await updateLocalLeadOutcome(params.leadId, params.outcome, params.newExpiryDate, effectiveNotes);
  } catch (leadErr) {
    console.warn('[SyncEngine] Failed to update local lead outcome:', leadErr);
  }

  // 3. If follow-up date is provided, create local follow-up entry
  if (params.followupDate) {
    try {
      const followupId = `fu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await upsertLocalFollowup({
        id: followupId,
        leadId: params.leadId,
        assignedTo: params.userId,
        type: 'call',
        scheduledAt: params.followupDate,
        status: 'pending',
        notes: effectiveNotes || `Follow-up: ${params.outcome}`
      });
    } catch (fuErr) {
      console.warn('[SyncEngine] Failed to create local follow-up:', fuErr);
    }
  }

  // 4. Enqueue mutation
  const mutation: OfflineMutation = {
    idempotencyKey,
    entityType: 'call',
    entityId: callId,
    action: 'create',
    payload: {
      leadId: params.leadId,
      outcome: params.outcome,
      notes: effectiveNotes,
      customNotes: params.customNotes,
      newExpiryDate: params.newExpiryDate,
      followupDate: params.followupDate,
      duration: params.duration,
      type: 'outbound'
    }
  };
  await enqueueOfflineMutation(mutation);

  const pending = await getPendingMutations();
  notifyStateChange({ pendingCount: pending.length, status: 'pending' });

  // 5. Try background sync (non-blocking)
  syncAll().catch(err => console.log('[SyncEngine] Background sync deferred:', err.message));

  return { callId, idempotencyKey };
}

/**
 * Phase 14: Mobile Background Sync Listeners
 * Binds to AppState 'active' event to trigger opportunistic sync on resume.
 */
let isListenerInitialized = false;
export function initSyncListeners(): void {
  if (isListenerInitialized) return;
  isListenerInitialized = true;

  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[SyncEngine] App resumed to active — triggering opportunistic sync');
      syncAll().catch(() => {});
    }
  });

  // Initial trigger
  syncAll().catch(() => {});
}
