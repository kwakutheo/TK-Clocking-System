-- =================================================================================
-- TK CLOCKING MULTI-TENANT SYSTEM
-- SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES
-- =================================================================================

-- 1. Enable Row Level Security on all tenant-bound tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_status_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create the restrictive isolation policies
-- These policies block access unless the user's JWT 'tenant_id' matches the row's 'tenant_id'

CREATE POLICY tenant_isolation_users ON users
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_employees ON employees
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_attendance ON attendance_logs
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_branches ON branches
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_shifts ON shifts
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_departments ON departments
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_terms ON academic_terms
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_term_breaks ON term_breaks
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_status_logs ON employee_status_logs
AS RESTRICTIVE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 3. Note for NestJS Backend:
-- Since NestJS connects via a standard Postgres connection (which bypasses RLS if using the postgres user), 
-- our TypeORM TenantBoundRepository handles the primary isolation. This RLS policy acts as a 
-- physical fail-safe for any direct Supabase client queries or external tools!
