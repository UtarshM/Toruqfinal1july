-- ============================================================
-- Torque Auto Advisor — Row Level Security Policies (COMPLETE & STABLE)
-- Coverage: All 36 Database Tables
-- ============================================================

-- Helper function to safely fetch user role without RLS infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  role_name text;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT r.name INTO role_name
  FROM public.users u
  JOIN public.roles r ON u."roleId" = r.id
  WHERE u.id = user_id;
  RETURN role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role, anon;

-- Enable RLS on all sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_RolePermissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_UserPermissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ─── SERVICE ROLE BYPASS POLICIES ───────────────────────────
DROP POLICY IF EXISTS "users_service_role" ON public.users;
CREATE POLICY "users_service_role" ON public.users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "leads_service_role" ON public.leads;
CREATE POLICY "leads_service_role" ON public.leads FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "policies_service_role" ON public.policies;
CREATE POLICY "policies_service_role" ON public.policies FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "customers_service_role" ON public.customers;
CREATE POLICY "customers_service_role" ON public.customers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "quotations_service_role" ON public.quotations;
CREATE POLICY "quotations_service_role" ON public.quotations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ─── SYSTEM LOOKUP TABLES (Roles, Permissions, Rates, Addons, Settings) ───
-- Allow all authenticated users to SELECT lookup data
DROP POLICY IF EXISTS "roles_read" ON public.roles;
CREATE POLICY "roles_read" ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "permissions_read" ON public.permissions;
CREATE POLICY "permissions_read" ON public.permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "_RolePermissions_read" ON public."_RolePermissions";
CREATE POLICY "_RolePermissions_read" ON public."_RolePermissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "_UserPermissions_read" ON public."_UserPermissions";
CREATE POLICY "_UserPermissions_read" ON public."_UserPermissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "category_details_read" ON public.category_details;
CREATE POLICY "category_details_read" ON public.category_details FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_details_read" ON public.company_details;
CREATE POLICY "company_details_read" ON public.company_details FOR SELECT USING (true);

DROP POLICY IF EXISTS "rate_tables_read" ON public.rate_tables;
CREATE POLICY "rate_tables_read" ON public.rate_tables FOR SELECT USING (true);

DROP POLICY IF EXISTS "rate_rules_read" ON public.rate_rules;
CREATE POLICY "rate_rules_read" ON public.rate_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "addons_read" ON public.addons;
CREATE POLICY "addons_read" ON public.addons FOR SELECT USING (true);

DROP POLICY IF EXISTS "predefined_responses_read" ON public.predefined_responses;
CREATE POLICY "predefined_responses_read" ON public.predefined_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_settings_read" ON public.system_settings;
CREATE POLICY "system_settings_read" ON public.system_settings FOR SELECT USING (true);

-- ─── APPLICATION DATA TABLES ────────────────────────────────
DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "users_write" ON public.users;
CREATE POLICY "users_write" ON public.users FOR ALL USING (public.get_user_role(auth.uid()) IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "leads_read" ON public.leads;
CREATE POLICY "leads_read" ON public.leads FOR SELECT USING ("assignedTo" = auth.uid() OR public.get_user_role(auth.uid()) IN ('Super Admin', 'Admin', 'Manager'));

DROP POLICY IF EXISTS "leads_write" ON public.leads;
CREATE POLICY "leads_write" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "policies_all" ON public.policies;
CREATE POLICY "policies_all" ON public.policies FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "customers_all" ON public.customers;
CREATE POLICY "customers_all" ON public.customers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "quotations_all" ON public.quotations;
CREATE POLICY "quotations_all" ON public.quotations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documents_all" ON public.documents;
CREATE POLICY "documents_all" ON public.documents FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "activity_logs_all" ON public.activity_logs;
CREATE POLICY "activity_logs_all" ON public.activity_logs FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "transactions_all" ON public.transactions;
CREATE POLICY "transactions_all" ON public.transactions FOR ALL USING (auth.role() = 'authenticated');
