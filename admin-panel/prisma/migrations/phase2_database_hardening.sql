-- ==============================================================================
-- TORQUE AUTO ADVISORS — PHASE 2 DATABASE HARDENING MIGRATION
-- ==============================================================================

-- 1. ADD NEW COLUMNS SAFELY
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "vehicleNoNormalized" VARCHAR(32);

ALTER TABLE "predefined_responses" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'General';
ALTER TABLE "predefined_responses" ADD COLUMN IF NOT EXISTS "followupDays" INTEGER DEFAULT 0;

ALTER TABLE "lead_assignments" ADD COLUMN IF NOT EXISTS "batchId" UUID;

-- 2. CREATE NEW SERVER MODELS / TABLES

-- Assignment Batches Table
CREATE TABLE IF NOT EXISTS "assignment_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sheetName" TEXT,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "totalLeads" INTEGER NOT NULL DEFAULT 0,
  "totalEmployees" INTEGER NOT NULL DEFAULT 0,
  "filters" JSONB DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdById" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revertedAt" TIMESTAMP(3),
  "revertedById" UUID REFERENCES "users"("id") ON DELETE SET NULL
);

-- Link LeadAssignment to AssignmentBatch if foreign key doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_assignments_batchId_fkey'
  ) THEN
    ALTER TABLE "lead_assignments"
    ADD CONSTRAINT "lead_assignments_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "assignment_batches"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Import Jobs Table
CREATE TABLE IF NOT EXISTS "import_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fileName" TEXT NOT NULL,
  "importName" TEXT NOT NULL,
  "fileUrl" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "createdById" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);

-- Import Row Errors Table
CREATE TABLE IF NOT EXISTS "import_row_errors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL REFERENCES "import_jobs"("id") ON DELETE CASCADE,
  "rowNumber" INTEGER NOT NULL,
  "vehicleNo" TEXT,
  "rawData" JSONB,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sync Events / Change Log Table (Change Feed for Mobile Sync)
CREATE TABLE IF NOT EXISTS "sync_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sequence" BIGSERIAL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "userId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Outbox Events Table (Reliable Asynchronous Event Processing)
CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);

-- Idempotency Keys Table
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "key" TEXT PRIMARY KEY,
  "handler" TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

-- 3. BACKFILL CANONICAL VEHICLE NUMBERS
UPDATE "leads"
SET "vehicleNoNormalized" = UPPER(REGEXP_REPLACE("vehicleNo", '[^a-zA-Z0-9]', '', 'g'))
WHERE "vehicleNoNormalized" IS NULL AND "vehicleNo" IS NOT NULL;

-- 4. REQUIRED INDEXES FOR PERFORMANCE HARDENING

-- Lead Indexes
CREATE INDEX IF NOT EXISTS "leads_vehicleNoNormalized_idx" ON "leads"("vehicleNoNormalized");
CREATE INDEX IF NOT EXISTS "leads_expiryDate_idx" ON "leads"("expiryDate");
CREATE INDEX IF NOT EXISTS "leads_importName_idx" ON "leads"("importName");
CREATE INDEX IF NOT EXISTS "leads_deletedAt_idx" ON "leads"("deletedAt");

-- Composite Lead Indexes
CREATE INDEX IF NOT EXISTS "leads_assignedTo_status_idx" ON "leads"("assignedTo", "status");
CREATE INDEX IF NOT EXISTS "leads_assignedTo_expiryDate_idx" ON "leads"("assignedTo", "expiryDate");
CREATE INDEX IF NOT EXISTS "leads_status_expiryDate_idx" ON "leads"("status", "expiryDate");
CREATE INDEX IF NOT EXISTS "leads_importName_deletedAt_idx" ON "leads"("importName", "deletedAt");

-- Assignment Batch & Lead Assignment Indexes
CREATE INDEX IF NOT EXISTS "assignment_batches_status_idx" ON "assignment_batches"("status");
CREATE INDEX IF NOT EXISTS "assignment_batches_month_year_idx" ON "assignment_batches"("month", "year");
CREATE INDEX IF NOT EXISTS "lead_assignments_batchId_idx" ON "lead_assignments"("batchId");
CREATE INDEX IF NOT EXISTS "lead_assignments_userId_assignedAt_idx" ON "lead_assignments"("userId", "assignedAt");

-- Import Job Indexes
CREATE INDEX IF NOT EXISTS "import_jobs_status_idx" ON "import_jobs"("status");
CREATE INDEX IF NOT EXISTS "import_jobs_importName_idx" ON "import_jobs"("importName");
CREATE INDEX IF NOT EXISTS "import_row_errors_jobId_idx" ON "import_row_errors"("jobId");

-- Sync & Outbox Indexes
CREATE INDEX IF NOT EXISTS "sync_events_sequence_idx" ON "sync_events"("sequence");
CREATE INDEX IF NOT EXISTS "sync_events_entity_idx" ON "sync_events"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "sync_events_createdAt_idx" ON "sync_events"("createdAt");
CREATE INDEX IF NOT EXISTS "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");
