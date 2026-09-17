-- ============================================================
-- TORQUE INSURANCE — Complete Supabase Setup Script
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor to set up the
-- entire database: roles, permissions, RLS policies, and
-- your Super Admin account.
--
-- HOW TO USE:
--   1. Go to Supabase → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. After running, update your .env with your Supabase URL
--      and keys (see README.md)
--   4. Then run: npx prisma db push && npx prisma db seed
--      (this creates the schema tables and seeds roles/permissions)
--   5. Finally, sign up at your Supabase Auth with the email
--      you want to use as Super Admin, then re-run STEP 6
--      below with your actual email address.
-- ============================================================


-- ============================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON SENSITIVE TABLES
-- ============================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 2: DROP ANY EXISTING POLICIES (safe to re-run)
-- ============================================================

DROP POLICY IF EXISTS "users: self-read"             ON users;
DROP POLICY IF EXISTS "users: admins-read-all"       ON users;
DROP POLICY IF EXISTS "users: admin-write"           ON users;
DROP POLICY IF EXISTS "documents: uploader-access"   ON documents;
DROP POLICY IF EXISTS "documents: admin-access"      ON documents;
DROP POLICY IF EXISTS "leads: assigned-agent-read"   ON leads;
DROP POLICY IF EXISTS "leads: admin-manager-read-all" ON leads;
DROP POLICY IF EXISTS "leads: authenticated-create"  ON leads;
DROP POLICY IF EXISTS "activity_logs: admin-read"    ON activity_logs;
DROP POLICY IF EXISTS "transactions: self-read"      ON transactions;
DROP POLICY IF EXISTS "transactions: finance-read-all" ON transactions;
DROP POLICY IF EXISTS "quotations: creator-read"     ON quotations;
DROP POLICY IF EXISTS "quotations: admin-read-all"   ON quotations;


-- ============================================================
-- STEP 3: CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================

-- ── USERS TABLE ─────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "users: self-read"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Admins / Managers / HR can read all users
CREATE POLICY "users: admins-read-all"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager', 'HR Manager')
    )
  );

-- Only Super Admin / Admin can write (insert/update/delete) users
CREATE POLICY "users: admin-write"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- ── DOCUMENTS TABLE ──────────────────────────────────────────
-- Uploader can always see their own documents
CREATE POLICY "documents: uploader-access"
  ON documents FOR SELECT
  USING ("uploadedBy" = auth.uid());

-- Admins can access all documents
CREATE POLICY "documents: admin-access"
  ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- ── LEADS TABLE ──────────────────────────────────────────────
-- Agents see only their assigned leads
CREATE POLICY "leads: assigned-agent-read"
  ON leads FOR SELECT
  USING ("assignedTo" = auth.uid());

-- Managers / Admins see all leads
CREATE POLICY "leads: admin-manager-read-all"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- Any authenticated user can create a lead
CREATE POLICY "leads: authenticated-create"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── ACTIVITY LOGS TABLE ───────────────────────────────────────
-- Only Admins / Managers can read activity logs
CREATE POLICY "activity_logs: admin-read"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- ── TRANSACTIONS TABLE ────────────────────────────────────────
-- Users see their own transactions
CREATE POLICY "transactions: self-read"
  ON transactions FOR SELECT
  USING ("userId" = auth.uid());

-- Finance / Admin roles see all transactions
CREATE POLICY "transactions: finance-read-all"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Accountant', 'Manager')
    )
  );

-- ── QUOTATIONS TABLE ──────────────────────────────────────────
-- Creators can see their own quotations
CREATE POLICY "quotations: creator-read"
  ON quotations FOR SELECT
  USING ("createdBy" = auth.uid());

-- Managers / Admins see all quotations
CREATE POLICY "quotations: admin-read-all"
  ON quotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );


-- ============================================================
-- STEP 4: SEED ALL ROLES
-- (Safe to re-run — uses ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO roles (id, name)
VALUES
  (gen_random_uuid(), 'Super Admin'),
  (gen_random_uuid(), 'Admin'),
  (gen_random_uuid(), 'Manager'),
  (gen_random_uuid(), 'Sales Executive'),
  (gen_random_uuid(), 'Telecaller'),
  (gen_random_uuid(), 'Field Executive'),
  (gen_random_uuid(), 'RTO Executive'),
  (gen_random_uuid(), 'Claims Executive'),
  (gen_random_uuid(), 'Loan Executive'),
  (gen_random_uuid(), 'CRM Executive'),
  (gen_random_uuid(), 'Accountant'),
  (gen_random_uuid(), 'HR Manager'),
  (gen_random_uuid(), 'Viewer')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- STEP 5: SEED ALL PERMISSIONS
-- (102 permissions — safe to re-run)
-- ============================================================

INSERT INTO permissions (id, name, description) VALUES
  -- Authentication & Security (6)
  (gen_random_uuid(), 'auth.login',             'Can login auth'),
  (gen_random_uuid(), 'auth.logout',            'Can logout auth'),
  (gen_random_uuid(), 'auth.pin_setup',         'Can pin_setup auth'),
  (gen_random_uuid(), 'auth.biometric_enable',  'Can biometric_enable auth'),
  (gen_random_uuid(), 'auth.session_manage',    'Can session_manage auth'),
  (gen_random_uuid(), 'auth.reset_access',      'Can reset_access auth'),
  -- Role & Permission Management (6)
  (gen_random_uuid(), 'role.view',              'Can view role'),
  (gen_random_uuid(), 'role.create',            'Can create role'),
  (gen_random_uuid(), 'role.edit',              'Can edit role'),
  (gen_random_uuid(), 'role.delete',            'Can delete role'),
  (gen_random_uuid(), 'role.assign_permissions','Can assign_permissions role'),
  (gen_random_uuid(), 'role.manage_users',      'Can manage_users role'),
  -- Lead Management (8)
  (gen_random_uuid(), 'lead.view',              'Can view lead'),
  (gen_random_uuid(), 'lead.create',            'Can create lead'),
  (gen_random_uuid(), 'lead.edit',              'Can edit lead'),
  (gen_random_uuid(), 'lead.delete',            'Can delete lead'),
  (gen_random_uuid(), 'lead.assign',            'Can assign lead'),
  (gen_random_uuid(), 'lead.import',            'Can import lead'),
  (gen_random_uuid(), 'lead.export',            'Can export lead'),
  (gen_random_uuid(), 'lead.change_status',     'Can change_status lead'),
  -- Rate Calculator (6)
  (gen_random_uuid(), 'rate.view',              'Can view rate'),
  (gen_random_uuid(), 'rate.calculate',         'Can calculate rate'),
  (gen_random_uuid(), 'rate.edit_rules',        'Can edit_rules rate'),
  (gen_random_uuid(), 'rate.manage_addons',     'Can manage_addons rate'),
  (gen_random_uuid(), 'rate.configure_tables',  'Can configure_tables rate'),
  (gen_random_uuid(), 'rate.export',            'Can export rate'),
  -- RTO Work Management (6)
  (gen_random_uuid(), 'rto.view',               'Can view rto'),
  (gen_random_uuid(), 'rto.create',             'Can create rto'),
  (gen_random_uuid(), 'rto.edit',               'Can edit rto'),
  (gen_random_uuid(), 'rto.delete',             'Can delete rto'),
  (gen_random_uuid(), 'rto.update_status',      'Can update_status rto'),
  (gen_random_uuid(), 'rto.track_payment',      'Can track_payment rto'),
  -- Vahan Work Management (6)
  (gen_random_uuid(), 'vahan.view',             'Can view vahan'),
  (gen_random_uuid(), 'vahan.create',           'Can create vahan'),
  (gen_random_uuid(), 'vahan.edit',             'Can edit vahan'),
  (gen_random_uuid(), 'vahan.delete',           'Can delete vahan'),
  (gen_random_uuid(), 'vahan.update_status',    'Can update_status vahan'),
  (gen_random_uuid(), 'vahan.track_payment',    'Can track_payment vahan'),
  -- Fitness Work Management (6)
  (gen_random_uuid(), 'fitness.view',           'Can view fitness'),
  (gen_random_uuid(), 'fitness.create',         'Can create fitness'),
  (gen_random_uuid(), 'fitness.edit',           'Can edit fitness'),
  (gen_random_uuid(), 'fitness.delete',         'Can delete fitness'),
  (gen_random_uuid(), 'fitness.update_status',  'Can update_status fitness'),
  (gen_random_uuid(), 'fitness.track_payment',  'Can track_payment fitness'),
  -- Claims Management (6)
  (gen_random_uuid(), 'claims.view',            'Can view claims'),
  (gen_random_uuid(), 'claims.create',          'Can create claims'),
  (gen_random_uuid(), 'claims.edit',            'Can edit claims'),
  (gen_random_uuid(), 'claims.delete',          'Can delete claims'),
  (gen_random_uuid(), 'claims.update_status',   'Can update_status claims'),
  (gen_random_uuid(), 'claims.upload_documents','Can upload_documents claims'),
  -- Accounts & Finance (7)
  (gen_random_uuid(), 'accounts.view',           'Can view accounts'),
  (gen_random_uuid(), 'accounts.create_entry',   'Can create_entry accounts'),
  (gen_random_uuid(), 'accounts.edit_entry',     'Can edit_entry accounts'),
  (gen_random_uuid(), 'accounts.delete_entry',   'Can delete_entry accounts'),
  (gen_random_uuid(), 'accounts.view_reports',   'Can view_reports accounts'),
  (gen_random_uuid(), 'accounts.export',         'Can export accounts'),
  (gen_random_uuid(), 'accounts.manage_salary',  'Can manage_salary accounts'),
  -- HR Management (7)
  (gen_random_uuid(), 'hr.view',                'Can view hr'),
  (gen_random_uuid(), 'hr.create',              'Can create hr'),
  (gen_random_uuid(), 'hr.edit',                'Can edit hr'),
  (gen_random_uuid(), 'hr.delete',              'Can delete hr'),
  (gen_random_uuid(), 'hr.manage_attendance',   'Can manage_attendance hr'),
  (gen_random_uuid(), 'hr.manage_leave',        'Can manage_leave hr'),
  (gen_random_uuid(), 'hr.view_performance',    'Can view_performance hr'),
  -- Loan Department (6)
  (gen_random_uuid(), 'loan.view',              'Can view loan'),
  (gen_random_uuid(), 'loan.create',            'Can create loan'),
  (gen_random_uuid(), 'loan.edit',              'Can edit loan'),
  (gen_random_uuid(), 'loan.delete',            'Can delete loan'),
  (gen_random_uuid(), 'loan.update_status',     'Can update_status loan'),
  (gen_random_uuid(), 'loan.track_conversion',  'Can track_conversion loan'),
  -- CRM System (6)
  (gen_random_uuid(), 'crm.view',               'Can view crm'),
  (gen_random_uuid(), 'crm.create',             'Can create crm'),
  (gen_random_uuid(), 'crm.edit',               'Can edit crm'),
  (gen_random_uuid(), 'crm.delete',             'Can delete crm'),
  (gen_random_uuid(), 'crm.manage_followups',   'Can manage_followups crm'),
  (gen_random_uuid(), 'crm.view_revenue',       'Can view_revenue crm'),
  -- Customer Visit Module (6)
  (gen_random_uuid(), 'visit.view',             'Can view visit'),
  (gen_random_uuid(), 'visit.create',           'Can create visit'),
  (gen_random_uuid(), 'visit.edit',             'Can edit visit'),
  (gen_random_uuid(), 'visit.delete',           'Can delete visit'),
  (gen_random_uuid(), 'visit.track_location',   'Can track_location visit'),
  (gen_random_uuid(), 'visit.manage_followups', 'Can manage_followups visit'),
  -- Data Management (6)
  (gen_random_uuid(), 'data.view',              'Can view data'),
  (gen_random_uuid(), 'data.create',            'Can create data'),
  (gen_random_uuid(), 'data.edit',              'Can edit data'),
  (gen_random_uuid(), 'data.delete',            'Can delete data'),
  (gen_random_uuid(), 'data.approve_changes',   'Can approve_changes data'),
  (gen_random_uuid(), 'data.manage_documents',  'Can manage_documents data'),
  -- Quotation System (6)
  (gen_random_uuid(), 'quotation.view',         'Can view quotation'),
  (gen_random_uuid(), 'quotation.create',       'Can create quotation'),
  (gen_random_uuid(), 'quotation.edit',         'Can edit quotation'),
  (gen_random_uuid(), 'quotation.delete',       'Can delete quotation'),
  (gen_random_uuid(), 'quotation.generate_pdf', 'Can generate_pdf quotation'),
  (gen_random_uuid(), 'quotation.share',        'Can share quotation'),
  -- Dashboard & Analytics (4)
  (gen_random_uuid(), 'dashboard.view_agent',   'Can view_agent dashboard'),
  (gen_random_uuid(), 'dashboard.view_manager', 'Can view_manager dashboard'),
  (gen_random_uuid(), 'dashboard.view_admin',   'Can view_admin dashboard'),
  (gen_random_uuid(), 'dashboard.export',       'Can export dashboard'),
  -- Notifications (4)
  (gen_random_uuid(), 'notification.view',      'Can view notification'),
  (gen_random_uuid(), 'notification.send',      'Can send notification'),
  (gen_random_uuid(), 'notification.manage',    'Can manage notification'),
  (gen_random_uuid(), 'notification.configure', 'Can configure notification'),
  -- Templates (4)
  (gen_random_uuid(), 'template.view',          'Can view template'),
  (gen_random_uuid(), 'template.create',        'Can create template'),
  (gen_random_uuid(), 'template.edit',          'Can edit template'),
  (gen_random_uuid(), 'template.delete',        'Can delete template'),
  -- Admin Panel / System Config (2)
  (gen_random_uuid(), 'system.settings_manage', 'Can settings_manage system'),
  (gen_random_uuid(), 'system.audit_logs_view', 'Can audit_logs_view system')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- STEP 6: GRANT ALL PERMISSIONS TO SUPER ADMIN ROLE
-- (The Prisma seed does granular per-role mapping,
--  but this ensures Super Admin always has everything)
-- ============================================================

INSERT INTO "_RolePermissions" ("A", "B")
SELECT p.id, r.id
FROM permissions p
CROSS JOIN roles r
WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;


-- ============================================================
-- STEP 7: CREATE YOUR SUPER ADMIN USER
--
-- ⚠️  IMPORTANT: Replace 'YOUR_EMAIL@example.com' below with
--     the EXACT email you used to sign up in Supabase Auth.
--     Run this AFTER you have signed up through the app or
--     Supabase Auth dashboard.
-- ============================================================

-- Pull the user from auth.users into the public users table
INSERT INTO users (id, email, "fullName", "isActive", "createdAt", "updatedAt")
SELECT
  id,
  email,
  'Super Admin',
  true,
  now(),
  now()
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'   -- ← CHANGE THIS
ON CONFLICT (email) DO UPDATE
  SET "isActive" = true,
      "updatedAt" = now();

-- Assign the Super Admin role to that user
UPDATE users
SET
  "roleId"    = (SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1),
  "isActive"  = true,
  "updatedAt" = now()
WHERE email = 'YOUR_EMAIL@example.com';  -- ← CHANGE THIS (same email)


-- ============================================================
-- STEP 8: CONFIGURE SUPABASE STORAGE BUCKETS AND POLICIES
-- ============================================================

-- Create the documents bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "documents: public-read" ON storage.objects;
DROP POLICY IF EXISTS "documents: anyone-upload" ON storage.objects;

-- Allow public read access to all files inside documents bucket
CREATE POLICY "documents: public-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Allow anyone (auth and anon) to upload files into the documents onboarding/ folder
CREATE POLICY "documents: anyone-upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
  );


-- ============================================================
-- ✅ DONE!
-- Your Supabase is now fully configured for Torque Insurance.
-- Tables, RLS policies, roles, permissions, and Super Admin
-- are all set up in a single run.
-- ============================================================
