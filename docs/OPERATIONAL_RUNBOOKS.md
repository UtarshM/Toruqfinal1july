# Torque Auto Advisors — Production Operational Runbooks

This document provides step-by-step remediation procedures for critical operational scenarios in production.

---

## Runbook 1: Import Job Failure & Row Error Remediation

### Symptoms & Triggers
- `ImportJob` status is `'failed'`.
- Upload progress stalls or stops before reaching 100%.
- Dashboard alerts show rejected rows exceeding threshold.

### Step-by-Step Resolution
1. **Locate Failed Job**:
   ```sql
   SELECT id, "fileName", "importName", status, "totalRows", "processedRows", "rejectedCount", "errorMessage"
   FROM import_jobs
   WHERE status = 'failed'
   ORDER BY "createdAt" DESC LIMIT 5;
   ```
2. **Inspect Row-Level Errors**:
   ```sql
   SELECT "rowNumber", field, reason, "originalValue"
   FROM import_row_errors
   WHERE "jobId" = '<JOB_ID>'
   ORDER BY "rowNumber" ASC LIMIT 50;
   ```
3. **Analyze Root Causes**:
   - **Invalid Registration Number**: Cell contained formatting characters or non-standard format that failed normalization.
   - **Unparseable Date**: Expiry date could not be converted to UTC date.
   - **Duplicate In File**: Multiple rows contained the identical registration number within the same sheet.
4. **Remediation**:
   - If error was data-specific: Fix the source spreadsheet rows and re-upload.
   - If error was network/timeout: Trigger re-commit via API or retry endpoint.
5. **Post-Fix Verification**:
   - Verify that inserted + updated + rejected rows equal `totalRows`.
   - Query `leads` table to confirm `vehicleNoNormalized` was populated for all new rows.

---

## Runbook 2: Assignment Anomaly & Safe Batch Revert

### Symptoms & Triggers
- Leads were allocated to an executive currently on approved leave ($\ge 5$ days).
- An employee exceeded the 400 capacity cap for the sheet.
- Sheet isolation was breached (e.g. Morbi leads assigned to Rajkot staff).

### Step-by-Step Resolution
1. **Halt Immediate Assignment Runs**:
   - Do not trigger additional assignment preview/confirms.
2. **Inspect the Faulty Batch**:
   ```sql
   SELECT id, "sheetName", month, year, "totalLeads", "totalEmployees", status, "createdAt"
   FROM assignment_batches
   WHERE id = '<BATCH_ID>';
   ```
3. **Execute Safe Batch Revert**:
   - Call the revert endpoint:
     ```bash
     curl -X POST https://admin-panel-delta-steel.vercel.app/api/v1/assignments/<BATCH_ID>/revert \
       -H "Authorization: Bearer <ADMIN_JWT>" \
       -H "Content-Type: application/json"
     ```
   - **Protection Mechanism**: The revert engine will only reset leads that are *still* assigned to the batch's designated recipient. If an executive or manager has manually reassigned a lead to another salesperson in the interim, that lead will NOT be touched.
4. **Verify Rollback Counts**:
   ```sql
   SELECT status, "revertedAt", "revertedById"
   FROM assignment_batches
   WHERE id = '<BATCH_ID>';
   ```
5. **Diagnose & Correct Rules**:
   - Verify employee leave record: Ensure `status = 'approved'` and `days >= 5` in `leave_requests`.
   - Re-run `POST /api/v1/assignments/preview` to verify the simulation plan before re-confirming.

---

## Runbook 3: Mobile Client Sync Deadlock & Conflict Resolution

### Symptoms & Triggers
- Mobile salesperson sees red badge `✕ Sync failed (Tap to retry)`.
- Mutations count in `local_sync_queue` does not decrement after tapping sync.
- Log error indicates `409 CONFLICT` or server rejection.

### Step-by-Step Resolution
1. **Identify the Stuck Mutation**:
   - In SQLite:
     ```sql
     SELECT id, idempotency_key, entity_type, entity_id, action, status, attempts, last_error
     FROM local_sync_queue
     WHERE status = 'failed';
     ```
2. **Evaluate Rejection Reason**:
   - **`409 CONFLICT`**: Another user (or admin) updated the lead while the salesperson was offline.
   - **Validation Error**: An outcome or date parameter violated validation rules.
3. **Resolution Strategy**:
   - **For 409 Conflicts**:
     - Call `pullSync()` to fetch latest server record into `local_leads`.
     - Salesperson reviews difference and taps "Retry & Overwrite" or discards the stale offline edit.
   - **For Network/Transient Failures**:
     - Call `retryFailedMutations()`:
       ```ts
       await retryFailedMutations();
       ```
4. **Health Check**:
   - Ensure `lastSyncCursor` in `local_sync_metadata` increments to the server's latest sequence number.

---

## Runbook 4: Database Migration Failure & Restore Procedures

### Symptoms & Triggers
- Prisma migration fails during CI/CD or production deployment.
- PostgreSQL error: constraint violation or table lock timeout.

### Step-by-Step Resolution
1. **Immediately Halt CI/CD Deployment**:
   - Cancel any running GitHub Actions or Vercel production deployment tasks.
2. **Check Migration State**:
   ```sql
   SELECT migration_name, finished_at, rolled_back_at
   FROM _prisma_migrations
   ORDER BY started_at DESC LIMIT 5;
   ```
3. **Restore from Snapshot**:
   - Point-In-Time Recovery (PITR) via Supabase Dashboard -> Backups -> Restore.
   - Alternatively, replay schema baseline from `/backups/phase0/schema_backup_2026-09-17.prisma`.
4. **Safe Forward Migration Procedure**:
   - Never run raw destructive SQL on production without running `EXPLAIN ANALYZE`.
   - Create large indexes using `CREATE INDEX CONCURRENTLY` to prevent table locking.
   - Verify row count consistency before and after schema adjustments.
