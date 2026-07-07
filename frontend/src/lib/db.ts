import * as SQLite from 'expo-sqlite';

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
 * Initializes all required database tables for local caching, cheques,
 * collection books, document tracking, and payroll.
 */
export async function initDB(): Promise<void> {
  try {
    const db = await getDB();

    // 1. High-Speed General Cache Table (replaces slow stringified AsyncStorage)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS general_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // 2. Cheques Table (Clearance lifecycle)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cheques (
        id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL,
        cheque_no TEXT NOT NULL,
        amount REAL NOT NULL,
        received_date TEXT NOT NULL,
        deposit_date TEXT,
        clearance_date TEXT,
        status TEXT DEFAULT 'received', -- 'received', 'deposited', 'cleared', 'bounced'
        bounce_reason TEXT,
        customer_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Ughrani Books Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ughrani_books (
        id TEXT PRIMARY KEY,
        book_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 4. Ughrani Assignments Table (Field collections tracking)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ughrani_assignments (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount_due REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'collected', 'partially_collected'
        collected_amount REAL DEFAULT 0.00,
        collected_date TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 5. Taken Cases Table (Physical document logistics tracking)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS taken_cases (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        document_name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'collected_from_client', 'submitted_to_office', 'processing', 'completed'
        updated_at TEXT NOT NULL
      );
    `);

    // 6. Salaries & Payroll Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS salaries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        base_salary REAL NOT NULL,
        commission_amount REAL DEFAULT 0.00,
        bonus_amount REAL DEFAULT 0.00,
        deductions REAL DEFAULT 0.00,
        net_payable REAL NOT NULL,
        disbursement_date TEXT,
        month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
        status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'disbursed'
        created_at TEXT NOT NULL
      );
    `);

    console.log('[SQLite] All database tables initialized successfully.');
  } catch (error) {
    console.error('[SQLite] Failed to initialize database tables:', error);
    throw error;
  }
}

/**
 * High-speed Key-Value database cache getter.
 */
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

/**
 * High-speed Key-Value database cache setter.
 */
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

/**
 * Clears the entire local SQLite cache.
 */
export async function clearSQLiteCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM general_cache');
  } catch (error) {
    console.error('[SQLite] Failed to clear general cache:', error);
  }
}
