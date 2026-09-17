# Torque Auto Advisors — Production Cutover & Dual Verification Plan

This document governs the safe transition from the legacy spreadsheet/in-memory workflow to the hardened PostgreSQL + Next.js + Expo SQLite offline architecture.

---

## 9-Step Cutover Roadmap

| Step | Phase | Description | Success Criteria | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | Database Hardening | Apply indexes, vehicle normalization column, new job/event models. | Zero table locks, canonical uppercase alphanumeric index live. | **COMPLETED** |
| **Step 2** | Parallel APIs | Deploy `/api/v1/leads`, `/api/v1/imports`, `/api/v1/assignments`, `/api/v1/sync` alongside legacy endpoints. | Standardized JSON responses, 0 type errors on Next.js build. | **COMPLETED** |
| **Step 3** | Import Engine Staging | Upload 80k+ Morbi test workbook into Import V2 worker. | Asynchronous job completes with chunked 250 upserts, row-level errors captured. | **VERIFIED** |
| **Step 4** | Assignment Engine Staging | Run test assignment batches across Morbi and Rajkot with leave exclusions. | Zero cross-sheet leakage, 400 cap honored, $\ge 5$ day leave exclusions verified. | **VERIFIED** |
| **Step 5** | Mobile SQLite Pilot | Activate `offlineSqlitePilot` flag for 2–3 pilot sales executives. | Leads cached locally, call logging works offline, sync succeeds upon resume. | **READY** |
| **Step 6** | Dual Verification | Compare old Excel manual assignments vs new automated assignment results. | Zero discrepancies in date-balanced distributions and recipient totals. | **READY** |
| **Step 7** | Production Pilot | Roll out to 1 branch manager and selected sales executive group. | Real calls and follow-ups processed with zero duplicate records. | **SCHEDULED** |
| **Step 8** | Full Rollout | Enable feature flags for all executives and branches. | P95 latency $< 300$ms on lead list, zero 5,000+ row memory bloat. | **SCHEDULED** |
| **Step 9** | Decommission Old Paths | Remove legacy spreadsheet polling scripts after 30 days of production stability. | System running purely on Supabase PostgreSQL + SQLite cache. | **PENDING** |

---

## Dual Verification Protocol (Step 6)

Before retiring manual spreadsheets, the operations team runs dual verification:

1. **Input Match**:
   - Provide the same raw Excel monthly sheet to both the legacy manual allocation and the new `/api/v1/assignments/preview`.
2. **Audit Metric Comparison**:
   - Total eligible unassigned leads count.
   - Per-executive allocation count (ensuring $\le 400$).
   - Excluded personnel (cross-check against HR approved leaves).
   - Date distribution spread (confirming leads on peak dates are rotated evenly).
3. **Sign-off**:
   - If variance is 0, admin confirms batch via `POST /api/v1/assignments/confirm`.
   - Idempotency key prevents double assignment.
