-- ============================================================
-- Torque Auto Advisor — Row Level Security Policies (FIXED)
-- Run this in the Supabase SQL Editor after enabling RLS.
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- ─── USERS TABLE ────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "users: self-read"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users with admin/manager role can read all users
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

-- Only admins can insert/update/delete users
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

-- ─── DOCUMENTS TABLE ────────────────────────────────────────
-- Uploader can always access their own documents
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

-- ─── LEADS TABLE ────────────────────────────────────────────
-- Agents see only their assigned leads
CREATE POLICY "leads: assigned-agent-read"
  ON leads FOR SELECT
  USING ("assignedTo" = auth.uid());

-- Managers/Admins see all leads
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

-- Any authenticated user can create leads
CREATE POLICY "leads: authenticated-create"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── ACTIVITY LOGS TABLE ────────────────────────────────────
-- Only admins can read all activity logs
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

-- ─── TRANSACTIONS TABLE ─────────────────────────────────────
-- Users see their own transactions
CREATE POLICY "transactions: self-read"
  ON transactions FOR SELECT
  USING ("userId" = auth.uid());

-- Admins/Accountants see all
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

-- ─── QUOTATIONS TABLE ───────────────────────────────────────
-- Creators can see their own quotations
CREATE POLICY "quotations: creator-read"
  ON quotations FOR SELECT
  USING ("createdBy" = auth.uid());

-- Managers/Admins see all
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
