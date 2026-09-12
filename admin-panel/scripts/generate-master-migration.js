const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

// Helper to escape SQL values safely based on column type
function escapeSqlValue(val, colType = '') {
  if (val === null || val === undefined) {
    return 'NULL';
  }

  const type = colType.toLowerCase();

  // 1. Numeric / Decimal / Floating point types
  if (
    type === 'numeric' ||
    type === 'decimal' ||
    type === 'double precision' ||
    type === 'real' ||
    type === 'integer' ||
    type === 'bigint' ||
    type === 'smallint'
  ) {
    if (typeof val === 'number') {
      return isNaN(val) ? 'NULL' : String(val);
    }
    // Prisma.Decimal or object with toString
    if (val && typeof val === 'object' && typeof val.toString === 'function') {
      return val.toString();
    }
    const num = Number(val);
    return isNaN(num) ? '0' : String(val);
  }

  // Check if val is Prisma.Decimal regardless of colType
  if (val && typeof val === 'object' && val.constructor && (val.constructor.name === 'Decimal' || val.toFixed)) {
    return val.toString();
  }

  // 2. Booleans
  if (type === 'boolean' || typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }

  // 3. Numbers
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val);
  }

  // 4. Dates & Timestamps
  if (val instanceof Date) {
    return `'${val.toISOString()}'::timestamptz`;
  }
  if (type.includes('timestamp') || type === 'date' || type === 'time') {
    const str = String(val).replace(/'/g, "''");
    return `'${str}'::timestamptz`;
  }

  // 5. Binary / Bytea
  if (Buffer.isBuffer(val)) {
    return `'\\x${val.toString('hex')}'::bytea`;
  }

  // 6. JSON / JSONB
  if (type === 'json' || type === 'jsonb') {
    if (typeof val === 'object') {
      const jsonStr = JSON.stringify(val).replace(/'/g, "''");
      return `'${jsonStr}'::jsonb`;
    }
    const escaped = String(val).replace(/'/g, "''");
    return `'${escaped}'::jsonb`;
  }

  // 7. General Objects (e.g. metadata or arrays not caught above)
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }

  // 8. Strings (text, varchar, uuid, etc.)
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function dumpTableData(tableName, schema = 'public') {
  try {
    // Get all columns that are NOT generated (e.g. exclude auth.users.confirmed_at and auth.identities.email)
    const nonGenCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 
        AND table_name = $2 
        AND (is_generated = 'NEVER' OR is_generated IS NULL OR is_generated = '')
      ORDER BY ordinal_position;
    `, schema, tableName);

    const allowedCols = nonGenCols.map(c => c.column_name);
    const colTypeMap = {};
    nonGenCols.forEach(c => {
      colTypeMap[c.column_name] = (c.data_type || '').toLowerCase();
    });

    if (allowedCols.length === 0) {
      return `-- Table "${schema}"."${tableName}": no non-generated columns\n`;
    }

    const colsSql = allowedCols.map(c => `"${c}"`).join(', ');
    const rows = await prisma.$queryRawUnsafe(`SELECT ${colsSql} FROM "${schema}"."${tableName}"`);
    if (!rows || rows.length === 0) {
      return `-- Table "${schema}"."${tableName}": 0 rows\n`;
    }

    let sql = `-- Table "${schema}"."${tableName}": ${rows.length} rows\n`;
    sql += `INSERT INTO "${schema}"."${tableName}" (${colsSql})\nVALUES\n`;

    const valueRows = rows.map(row => {
      const vals = allowedCols.map(c => escapeSqlValue(row[c], colTypeMap[c]));
      return `  (${vals.join(', ')})`;
    });

    sql += valueRows.join(',\n');
    sql += `\nON CONFLICT DO NOTHING;\n\n`;
    return sql;
  } catch (err) {
    console.error(`Error dumping ${schema}.${tableName}:`, err.message);
    return `-- Error dumping ${schema}.${tableName}: ${err.message}\n`;
  }
}

async function main() {
  console.log('🚀 Generating Master Supabase Migration Script...');

  const outputPath = path.join(__dirname, '..', '..', 'master_migration.sql');
  let masterSql = '';

  masterSql += `-- =========================================================================\n`;
  masterSql += `-- TORQUE AUTO ADVISOR - MASTER SUPABASE DATABASE MIGRATION SCRIPT\n`;
  masterSql += `-- Generated at: ${new Date().toISOString()}\n`;
  masterSql += `-- This script contains:\n`;
  masterSql += `--   1. Database Extensions\n`;
  masterSql += `--   2. Complete Table Schemas (DDL), Primary Keys & Foreign Keys\n`;
  masterSql += `--   3. Authentication Data (auth.users, auth.identities) for instant login\n`;
  masterSql += `--   4. All Public Table Data (Roles, Users, Permissions, Leads, Policies, etc.)\n`;
  masterSql += `--   5. Supabase Storage Bucket Configuration\n`;
  masterSql += `--   6. Database Automation Functions & Triggers\n`;
  masterSql += `--   7. Row Level Security (RLS) Policies\n`;
  masterSql += `-- =========================================================================\n\n`;

  masterSql += `-- ─── STEP 0: DISABLE FOREIGN KEYS & TRIGGERS TEMPORARILY ─────────────────\n`;
  masterSql += `SET session_replication_role = 'replica';\n\n`;

  masterSql += `-- ─── STEP 1: ENABLE REQUIRED EXTENSIONS ──────────────────────────────────\n`;
  masterSql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  masterSql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

  console.log('Step 2: Generating DDL from Prisma schema...');
  let ddl = '';
  try {
    ddl = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
  } catch (err) {
    console.error('Error generating Prisma DDL:', err);
  }

  // Harden DDL so it never fails on re-runs or existing objects
  ddl = ddl
    .replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX /g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX /g, 'CREATE INDEX IF NOT EXISTS ')
    .replace(/ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"/g, 'ALTER TABLE "$1" DROP CONSTRAINT IF EXISTS "$2";\nALTER TABLE "$1" ADD CONSTRAINT "$2"');

  // Also include the 3 extra tables: addons, predefined_responses, system_settings
  const extraTablesDdl = `
-- Table addons
CREATE TABLE IF NOT EXISTS "addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'flat',
    "priceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

-- Table predefined_responses
CREATE TABLE IF NOT EXISTS "predefined_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "predefined_responses_pkey" PRIMARY KEY ("id")
);

-- Table system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");
`;

  masterSql += `-- ─── STEP 2: SCHEMA DEFINITION (TABLES, COLUMNS & CONSTRAINTS) ──────────\n`;
  masterSql += ddl;
  masterSql += `\n${extraTablesDdl}\n\n`;

  console.log('Step 3: Exporting Supabase Auth data (auth.users & auth.identities)...');
  masterSql += `-- ─── STEP 3: SUPABASE AUTHENTICATION ACCOUNTS (auth.users & auth.identities) ─\n`;
  masterSql += `-- This restores all login credentials, encrypted passwords, and user IDs.\n\n`;

  const authUsersSql = await dumpTableData('users', 'auth');
  masterSql += authUsersSql;
  masterSql += `\n-- Ensure torqueautoadvisor@gmail.com password is Perin@3623 even if row already existed\n` +
    `UPDATE "auth"."users"\n` +
    `SET "encrypted_password" = '$2a$10$xAqmudt1zNB3K9MS/eNhq.C28AJvFVFLJgqIT/32l1z6t6Hk8GVr.'\n` +
    `WHERE "email" = 'torqueautoadvisor@gmail.com';\n\n`;

  const authIdentitiesSql = await dumpTableData('identities', 'auth');
  masterSql += authIdentitiesSql;

  console.log('Step 4: Exporting Public Data (36 tables)...');
  masterSql += `-- ─── STEP 4: PUBLIC DATABASE TABLES DATA ──────────────────────────────────\n\n`;

  const publicTablesOrder = [
    'roles',
    'permissions',
    '_RolePermissions',
    'users',
    '_UserPermissions',
    'category_details',
    'company_details',
    'rate_tables',
    'rate_rules',
    'quotation_relationship_details',
    'addons',
    'predefined_responses',
    'system_settings',
    'leads',
    'customers',
    'policies',
    'quotations',
    'calls',
    'follow_ups',
    'claims',
    'transactions',
    'loans',
    'rto_work',
    'fitness_work',
    'activity_logs',
    'documents',
    'visits',
    'notifications',
    'data_change_requests',
    'lead_assignments',
    'lead_whatsapp_logs',
    'lead_status_history',
    'attendance',
    'leave_requests',
    'salaries',
    'renewal_records'
  ];

  for (const t of publicTablesOrder) {
    console.log(`Dumping public.${t}...`);
    const tSql = await dumpTableData(t, 'public');
    masterSql += tSql;
  }

  console.log('Step 5: Storage bucket setup...');
  masterSql += `-- ─── STEP 5: SUPABASE STORAGE BUCKETS ─────────────────────────────────────\n`;
  masterSql += `INSERT INTO storage.buckets (id, name, public)\nVALUES ('documents', 'documents', true)\nON CONFLICT (id) DO NOTHING;\n\n`;

  console.log('Step 6: Adding triggers & functions...');
  masterSql += `-- ─── STEP 6: AUTOMATION FUNCTIONS & TRIGGERS ─────────────────────────────\n`;
  masterSql += `
-- 1. Automatic profile creation on auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, "fullName", "isActive", "createdAt", "updatedAt")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Employee'),
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Automatic cleanup on auth user deletion
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users SET "managerId" = NULL WHERE "managerId" = old.id;
  UPDATE public.leads SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.claims SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.loans SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.rto_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.fitness_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.visits SET "userId" = NULL WHERE "userId" = old.id;
  UPDATE public.transactions SET "userId" = NULL WHERE "userId" = old.id;
  UPDATE public.quotations SET "createdBy" = NULL WHERE "createdBy" = old.id;
  UPDATE public.leave_requests SET "approvedBy" = NULL WHERE "approvedBy" = old.id;

  DELETE FROM public.notifications WHERE "userId" = old.id;
  DELETE FROM public.attendance WHERE "userId" = old.id;
  DELETE FROM public.salaries WHERE "userId" = old.id;
  DELETE FROM public.lead_assignments WHERE "userId" = old.id;
  DELETE FROM public.activity_logs WHERE "userId" = old.id;
  DELETE FROM public.lead_whatsapp_logs WHERE "userId" = old.id;
  DELETE FROM public.lead_status_history WHERE "userId" = old.id;
  DELETE FROM public.leave_requests WHERE "userId" = old.id;

  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
\n`;

  console.log('Step 7: Adding Row Level Security (RLS) policies...');
  masterSql += `-- ─── STEP 7: ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────\n`;
  const rlsPath = path.join(__dirname, '..', 'prisma', 'rls_policies.sql');
  if (fs.existsSync(rlsPath)) {
    let rlsContent = fs.readFileSync(rlsPath, 'utf8');
    rlsContent = rlsContent.replace(
      /CREATE POLICY "([^"]+)"\s*\n\s*ON\s+([a-zA-Z0-9_]+)/g,
      'DROP POLICY IF EXISTS "$1" ON $2;\nCREATE POLICY "$1"\n  ON $2'
    );
    masterSql += rlsContent;
  }

  masterSql += `\n\n-- ─── STEP 8: RE-ENABLE FOREIGN KEYS & TRIGGERS ─────────────────────────\n`;
  masterSql += `SET session_replication_role = 'origin';\n\n`;
  masterSql += `-- =========================================================================\n`;
  masterSql += `-- MIGRATION COMPLETE!\n`;
  masterSql += `-- =========================================================================\n`;

  fs.writeFileSync(outputPath, masterSql, 'utf8');
  console.log(`\n🎉 MASTER SCRIPT CREATED SUCCESSFULLY AT:`);
  console.log(outputPath);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
