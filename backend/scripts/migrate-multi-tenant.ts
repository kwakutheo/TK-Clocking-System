/**
 * Migration script: Assign all existing single-tenant data to a Default Tenant.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/migrate-multi-tenant.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Entities
import { Tenant } from '../src/modules/tenants/tenant.entity';
import { User } from '../src/modules/users/user.entity';
import { Employee } from '../src/modules/employees/employee.entity';
import { Branch } from '../src/modules/branches/branch.entity';
import { AttendanceLog } from '../src/modules/attendance/attendance-log.entity';
import { Shift } from '../src/modules/shifts/shift.entity';
import { Department } from '../src/modules/departments/department.entity';
import { AcademicTerm } from '../src/modules/academic-calendar/term.entity';
import { EmployeeStatusLog } from '../src/modules/employees/employee-status-log.entity';
import { TermBreak } from '../src/modules/academic-calendar/term-break.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'tk_clocking',
  entities: [Tenant, User, Employee, Branch, AttendanceLog, Shift, Department, AcademicTerm, EmployeeStatusLog, TermBreak],
  synchronize: true,
  logging: false,
});

async function migrateMultiTenant() {
  await AppDataSource.initialize();
  console.log('Connected to database.\n');

  // 1. Find or create the default tenant
  const tenantRepo = AppDataSource.getRepository(Tenant);
  let defaultTenant = await tenantRepo.findOne({ where: { slug: 'default-school' } });

  if (!defaultTenant) {
    console.log('Creating Default Tenant...');
    defaultTenant = tenantRepo.create({
      name: 'Default School',
      slug: 'default-school',
    });
    await tenantRepo.save(defaultTenant);
    console.log(`Created Default Tenant with ID: ${defaultTenant.id}\n`);
  } else {
    console.log(`Default Tenant found. ID: ${defaultTenant.id}\n`);
  }

  // 2. Migrate tables
  const tablesToMigrate = [
    { name: 'Users', repo: AppDataSource.getRepository(User) },
    { name: 'Employees', repo: AppDataSource.getRepository(Employee) },
    { name: 'Branches', repo: AppDataSource.getRepository(Branch) },
    { name: 'AttendanceLogs', repo: AppDataSource.getRepository(AttendanceLog) },
    { name: 'Shifts', repo: AppDataSource.getRepository(Shift) },
    { name: 'Departments', repo: AppDataSource.getRepository(Department) },
    { name: 'AcademicTerms', repo: AppDataSource.getRepository(AcademicTerm) },
  ];

  for (const { name, repo } of tablesToMigrate) {
    console.log(`Migrating ${name}...`);
    
    // Update all records where tenantId is NULL
    const result = await repo
      .createQueryBuilder()
      .update()
      .set({ tenantId: defaultTenant.id } as any)
      .where('tenant_id IS NULL')
      .execute();
      
    console.log(`  ✅ Updated ${result.affected || 0} ${name} records.`);
  }

  console.log('\n🎉 Multi-tenant data migration completed successfully!');
  await AppDataSource.destroy();
}

migrateMultiTenant().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
