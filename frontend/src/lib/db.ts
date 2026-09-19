import * as SQLite from 'expo-sqlite';
import { MASTER_CALL_OUTCOMES } from './call-outcomes';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Retrieves the open database instance, creating it if it doesn't exist.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = await SQLite.openDatabaseAsync('torque.db');
    return dbInstance;
  } catch (error) {
    console.error('[SQLite] Failed to open database:', error);
    throw error;
  }
}

/**
 * Initializes all required database tables:
 * 1. General cache & legacy bookkeeping tables
 * 2. Phase 9 Offline-First tables (local_leads, local_calls, local_followups, local_responses, local_assignments, local_notifications, local_sync_queue, local_sync_metadata)
 */
export async function initDB(): Promise<void> {
  try {
    const db = await getDB();

    // 1. General Key-Value Cache
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS general_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // 2. Offline Sync Metadata Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 3. Offline Mutations Queue
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_sync_queue (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON local_sync_queue(status);
    `);

    // 4. Local Assigned Leads (Indexed on status, vehicle_no_normalized, expiry_date)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_leads (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        client_email TEXT,
        vehicle_no TEXT,
        vehicle_no_normalized TEXT,
        status TEXT NOT NULL,
        city TEXT,
        assigned_to TEXT,
        expiry_date TEXT,
        remarks TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_leads_status ON local_leads(status);
      CREATE INDEX IF NOT EXISTS idx_local_leads_veh_norm ON local_leads(vehicle_no_normalized);
      CREATE INDEX IF NOT EXISTS idx_local_leads_expiry ON local_leads(expiry_date);
    `);

    // 5. Local Calls
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_calls (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT DEFAULT 'outbound',
        outcome TEXT NOT NULL,
        duration INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_calls_lead ON local_calls(lead_id);
    `);

    // 6. Local Follow-ups
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_followups (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        assigned_to TEXT,
        lead_name TEXT,
        type TEXT DEFAULT 'call',
        scheduled_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_followups_scheduled ON local_followups(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_local_followups_status ON local_followups(status);
    `);

    // 7. Master Predefined Responses (36 master responses)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_responses (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        category TEXT,
        requires_followup INTEGER DEFAULT 0,
        followup_days INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0
      );
    `);

    // 8. Local Notifications
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        data TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 9. Legacy Bookkeeping Tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cheques (
        id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL,
        cheque_no TEXT NOT NULL,
        amount REAL NOT NULL,
        received_date TEXT NOT NULL,
        deposit_date TEXT,
        clearance_date TEXT,
        status TEXT DEFAULT 'received',
        bounce_reason TEXT,
        customer_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ughrani_books (
        id TEXT PRIMARY KEY,
        book_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ughrani_assignments (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount_due REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        collected_amount REAL DEFAULT 0.00,
        collected_date TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS taken_cases (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        document_name TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS salaries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        base_salary REAL NOT NULL,
        commission_amount REAL DEFAULT 0.00,
        bonus_amount REAL DEFAULT 0.00,
        deductions REAL DEFAULT 0.00,
        net_payable REAL NOT NULL,
        disbursement_date TEXT,
        month_year TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
    `);

    // 10. Seed 36 master responses if empty
    try {
      const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM local_responses');
      if (!countRow || countRow.count === 0) {
        for (const item of MASTER_CALL_OUTCOMES) {
          await db.runAsync(
            `INSERT OR REPLACE INTO local_responses (id, text, category, requires_followup, followup_days, is_active, order_index)
             VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [item.id, item.text, item.category, item.requiresFollowUp ? 1 : 0, item.followupDays, item.orderIndex]
          );
        }
        console.log('[SQLite] Seeded 36 master call outcomes into local_responses.');
      }
    } catch (seedErr) {
      console.warn('[SQLite] Failed to seed local_responses:', seedErr);
    }

    console.log('[SQLite] Offline-first & application tables initialized successfully.');
  } catch (error) {
    console.error('[SQLite] Failed to initialize database tables:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC METADATA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getSyncMetadata(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM local_sync_metadata WHERE key = ?',
      [key]
    );
    return row ? row.value : null;
  } catch (err) {
    console.error(`[SQLite] Failed to read sync metadata for key ${key}:`, err);
    return null;
  }
}

export async function setSyncMetadata(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      'INSERT OR REPLACE INTO local_sync_metadata (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, Date.now()]
    );
  } catch (err) {
    console.error(`[SQLite] Failed to set sync metadata for key ${key}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE MUTATION QUEUE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface OfflineMutation {
  idempotencyKey: string;
  entityType: 'call' | 'lead' | 'followup';
  entityId?: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
}

export async function enqueueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  const db = await getDB();
  const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const payloadStr = JSON.stringify(mutation.payload);
  await db.runAsync(
    `INSERT INTO local_sync_queue (id, idempotency_key, entity_type, entity_id, action, payload, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, mutation.idempotencyKey, mutation.entityType, mutation.entityId || null, mutation.action, payloadStr, Date.now()]
  );
}

export async function getPendingMutations(): Promise<Array<{
  id: string;
  idempotencyKey: string;
  entityType: 'call' | 'lead' | 'followup';
  entityId?: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  attempts: number;
}>> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    "SELECT id, idempotency_key, entity_type, entity_id, action, payload, attempts FROM local_sync_queue WHERE status = 'pending' ORDER BY created_at ASC"
  );
  return rows.map(r => ({
    id: r.id,
    idempotencyKey: r.idempotency_key,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    payload: JSON.parse(r.payload),
    attempts: r.attempts
  }));
}

export async function markMutationSynced(idempotencyKey: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    "UPDATE local_sync_queue SET status = 'synced' WHERE idempotency_key = ?",
    [idempotencyKey]
  );
}

export async function markMutationFailed(idempotencyKey: string, error: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    "UPDATE local_sync_queue SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE idempotency_key = ?",
    [error, idempotencyKey]
  );
}

const safeIsoDate = (d: any): string | null => {
  if (!d) return null;
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL LEADS OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertLocalLead(lead: any): Promise<void> {
  if (!lead || !lead.id) return;
  const db = await getDB();
  const vNo = lead.vehicleNo || lead.vehicle_no || null;
  const vNorm = lead.vehicleNoNormalized || (vNo ? String(vNo).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null);

  await db.runAsync(
    `INSERT OR REPLACE INTO local_leads (
       id, client_name, client_phone, client_email, vehicle_no,
       vehicle_no_normalized, status, city, assigned_to, expiry_date, remarks, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(lead.id),
      lead.clientName || lead.client_name || 'Unnamed',
      lead.clientPhone || lead.client_phone || null,
      lead.clientEmail || lead.client_email || null,
      vNo,
      vNorm,
      lead.status || 'New',
      lead.city || null,
      lead.assignedTo || lead.assigned_to || null,
      safeIsoDate(lead.expiryDate || lead.expiry_date),
      lead.remarks || null,
      safeIsoDate(lead.updatedAt || lead.updated_at) || new Date().toISOString()
    ]
  );
}

export async function upsertLocalLeadsBatch(leads: any[]): Promise<void> {
  if (!Array.isArray(leads) || leads.length === 0) return;
  const db = await getDB();
  const insertQuery = `INSERT OR REPLACE INTO local_leads (
    id, client_name, client_phone, client_email, vehicle_no,
    vehicle_no_normalized, status, city, assigned_to, expiry_date, remarks, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const runBatch = async () => {
    for (const lead of leads) {
      if (!lead || !lead.id) continue;
      const vNo = lead.vehicleNo || lead.vehicle_no || null;
      const vNorm = lead.vehicleNoNormalized || (vNo ? String(vNo).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null);
      await db.runAsync(insertQuery, [
        String(lead.id),
        lead.clientName || lead.client_name || 'Unnamed',
        lead.clientPhone || lead.client_phone || null,
        lead.clientEmail || lead.client_email || null,
        vNo,
        vNorm,
        lead.status || 'New',
        lead.city || null,
        lead.assignedTo || lead.assigned_to || null,
        safeIsoDate(lead.expiryDate || lead.expiry_date),
        lead.remarks || null,
        safeIsoDate(lead.updatedAt || lead.updated_at) || new Date().toISOString()
      ]);
    }
  };

  if (typeof db.withTransactionAsync === 'function') {
    await db.withTransactionAsync(runBatch).catch(async () => {
      await runBatch();
    });
  } else {
    await runBatch();
  }
}

export async function getLocalLeads(options: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<any[]> {
  const db = await getDB();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let query = 'SELECT * FROM local_leads WHERE 1=1';
  const params: any[] = [];

  if (options.status && options.status !== 'all') {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim()}%`;
    query += ' AND (client_name LIKE ? OR client_phone LIKE ? OR vehicle_no LIKE ? OR vehicle_no_normalized LIKE ?)';
    params.push(s, s, s, s);
  }

  query += ' ORDER BY expiry_date ASC, updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.getAllAsync<any>(query, params);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL CALL OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function insertLocalCall(call: any): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_calls (id, lead_id, user_id, type, outcome, duration, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      call.id,
      call.leadId || call.lead_id,
      call.userId || call.user_id,
      call.type || 'outbound',
      call.outcome,
      call.duration || null,
      call.notes || null,
      call.createdAt ? new Date(call.createdAt).toISOString() : new Date().toISOString()
    ]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL CACHE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getCacheItem(key: string): Promise<any | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string; timestamp: number }>(
      'SELECT value, timestamp FROM general_cache WHERE key = ?',
      [key]
    );
    if (!row) return null;
    return JSON.parse(row.value);
  } catch (error) {
    console.error(`[SQLite] Cache read failed for key ${key}:`, error);
    return null;
  }
}

export async function setCacheItem(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    const jsonStr = JSON.stringify(value);
    const now = Date.now();
    await db.runAsync(
      'INSERT OR REPLACE INTO general_cache (key, value, timestamp) VALUES (?, ?, ?)',
      [key, jsonStr, now]
    );
  } catch (error) {
    console.error(`[SQLite] Cache write failed for key ${key}:`, error);
  }
}

export async function clearSQLiteCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM general_cache');
  } catch (error) {
    console.error('[SQLite] Failed to clear general cache:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREDEFINED RESPONSES & FOLLOW-UPS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getLocalResponses(): Promise<any[]> {
  try {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(
      'SELECT id, text, category, requires_followup as requiresFollowUp, followup_days as followupDays FROM local_responses WHERE is_active = 1 ORDER BY order_index ASC'
    );
    if (rows && rows.length > 0) return rows;
    return MASTER_CALL_OUTCOMES;
  } catch (err) {
    console.warn('[SQLite] getLocalResponses fallback to memory constant:', err);
    return MASTER_CALL_OUTCOMES;
  }
}

export async function upsertLocalFollowup(followup: any): Promise<void> {
  if (!followup || !followup.id) return;
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_followups (id, lead_id, assigned_to, lead_name, type, scheduled_at, status, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(followup.id),
      followup.leadId || followup.lead_id || '',
      followup.assignedTo || followup.assigned_to || null,
      followup.leadName || followup.lead_name || null,
      followup.type || 'call',
      safeIsoDate(followup.scheduledAt || followup.scheduled_at) || new Date().toISOString(),
      followup.status || 'pending',
      followup.notes || null,
      safeIsoDate(followup.updatedAt || followup.updated_at) || new Date().toISOString()
    ]
  );
}

export async function upsertLocalFollowupsBatch(followups: any[]): Promise<void> {
  if (!Array.isArray(followups) || followups.length === 0) return;
  const db = await getDB();
  const insertQuery = `INSERT OR REPLACE INTO local_followups (
    id, lead_id, assigned_to, lead_name, type, scheduled_at, status, notes, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const runBatch = async () => {
    for (const f of followups) {
      if (!f || !f.id) continue;
      await db.runAsync(insertQuery, [
        String(f.id),
        f.leadId || f.lead_id || '',
        f.assignedTo || f.assigned_to || null,
        f.leadName || f.lead_name || null,
        f.type || 'call',
        safeIsoDate(f.scheduledAt || f.scheduled_at) || new Date().toISOString(),
        f.status || 'pending',
        f.notes || null,
        safeIsoDate(f.updatedAt || f.updated_at) || new Date().toISOString()
      ]);
    }
  };

  if (typeof db.withTransactionAsync === 'function') {
    await db.withTransactionAsync(runBatch).catch(async () => {
      await runBatch();
    });
  } else {
    await runBatch();
  }
}

export async function getLocalFollowups(filter?: string): Promise<any[]> {
  const db = await getDB();
  let query = 'SELECT * FROM local_followups';
  const params: any[] = [];
  if (filter && filter !== 'all') {
    query += ' WHERE status = ?';
    params.push(filter);
  }
  query += ' ORDER BY scheduled_at ASC';
  return db.getAllAsync<any>(query, params);
}

export async function updateLocalLeadOutcome(leadId: string, outcome: string, newExpiryDate?: string, remarks?: string): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  if (newExpiryDate) {
    await db.runAsync(
      "UPDATE local_leads SET status = 'Contacted', expiry_date = ?, remarks = COALESCE(?, remarks), updated_at = ? WHERE id = ?",
      [newExpiryDate, remarks || outcome, now, leadId]
    );
  } else {
    await db.runAsync(
      "UPDATE local_leads SET status = 'Contacted', remarks = COALESCE(?, remarks), updated_at = ? WHERE id = ?",
      [remarks || outcome, now, leadId]
    );
  }
}

export async function getLocalLeadById(id: string): Promise<any | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<any>('SELECT * FROM local_leads WHERE id = ?', [id]);
    return row || null;
  } catch (err) {
    console.warn('[SQLite] getLocalLeadById error:', err);
    return null;
  }
}

export async function getLocalCallsForLead(leadId: string): Promise<any[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<any>('SELECT * FROM local_calls WHERE lead_id = ? ORDER BY created_at DESC', [leadId]);
  } catch (err) {
    console.warn('[SQLite] getLocalCallsForLead error:', err);
    return [];
  }
}


