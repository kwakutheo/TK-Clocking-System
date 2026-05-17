-- =================================================================================
-- TK CLOCKING MULTI-TENANT SCHEMA GENERATION (PRODUCTION)
-- Run this in your Supabase SQL Editor BEFORE enabling RLS.
-- =================================================================================

-- 1. Create the Master Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar UNIQUE NOT NULL,
  name varchar NOT NULL,
  logo_url varchar,
  "isActive" boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 2. Create the "Default School" so your existing data has a home
INSERT INTO tenants (id, slug, name) 
VALUES ('56a534c8-43f5-403f-9c50-761f88867dfd', 'default-school', 'Default School')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add the 'tenant_id' column to all existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE term_breaks ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE employee_status_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 4. Update all existing records to belong to the Default School
UPDATE users SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE employees SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE attendance_logs SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE branches SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE shifts SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE departments SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE academic_terms SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE term_breaks SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;
UPDATE employee_status_logs SET tenant_id = '56a534c8-43f5-403f-9c50-761f88867dfd' WHERE tenant_id IS NULL;

-- 5. Add Foreign Key Constraints to lock the data together securely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_tenant') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_tenant') THEN
        ALTER TABLE employees ADD CONSTRAINT fk_employees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_tenant') THEN
        ALTER TABLE attendance_logs ADD CONSTRAINT fk_attendance_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_tenant') THEN
        ALTER TABLE branches ADD CONSTRAINT fk_branches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shifts_tenant') THEN
        ALTER TABLE shifts ADD CONSTRAINT fk_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_tenant') THEN
        ALTER TABLE departments ADD CONSTRAINT fk_departments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_terms_tenant') THEN
        ALTER TABLE academic_terms ADD CONSTRAINT fk_terms_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_term_breaks_tenant') THEN
        ALTER TABLE term_breaks ADD CONSTRAINT fk_term_breaks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_status_logs_tenant') THEN
        ALTER TABLE employee_status_logs ADD CONSTRAINT fk_status_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
