/**
 * Database Seed Script
 *
 * Creates realistic Ghana-focused sample data:
 *  - 1 Super Admin user
 *  - 1 HR Admin user
 *  - 3 Departments
 *  - 2 Branches (Accra HQ + Kumasi Office)
 *  - 2 Shifts
 *  - 5 Employee users
 *
 * Run:  npx ts-node -r tsconfig-paths/register src/database/seed.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Entities ───────────────────────────────────────────────────────────────────
import { User } from '../modules/users/user.entity';
import { Employee } from '../modules/employees/employee.entity';
import { Department } from '../modules/departments/department.entity';
import { Branch } from '../modules/branches/branch.entity';
import { Shift } from '../modules/shifts/shift.entity';
import { AcademicTerm } from '../modules/academic-calendar/term.entity';
import { TermBreak } from '../modules/academic-calendar/term-break.entity';
import { AttendanceLog } from '../modules/attendance/attendance-log.entity';
import { UserRole, EmployeeStatus } from '../common/enums';

// ── DataSource ────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'tk_clocking',
  entities: [User, Employee, Department, Branch, Shift, AcademicTerm, TermBreak, AttendanceLog],
  synchronize: false,
  logging: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Connected to database. Starting seed…\n');

  const userRepo = AppDataSource.getRepository(User);
  const employeeRepo = AppDataSource.getRepository(Employee);
  const deptRepo = AppDataSource.getRepository(Department);
  const branchRepo = AppDataSource.getRepository(Branch);
  const shiftRepo = AppDataSource.getRepository(Shift);
  const termRepo = AppDataSource.getRepository(AcademicTerm);

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ── Academic Terms ──────────────────────────────────────────────────────────
  console.log('Creating/Updating academic terms…');
  let currentTerm = await termRepo.findOne({ where: { name: 'Term 1', academicYear: '2023/2024' } });
  if (!currentTerm) {
    currentTerm = await termRepo.save(termRepo.create({
      name: 'Term 1',
      academicYear: '2023/2024',
      startDate: '2024-01-01',
      endDate: '2024-04-30',
      isActive: true,
    }));
  }

  // ── Departments ─────────────────────────────────────────────────────────────
  console.log('Creating/Updating departments…');
  const deptNames = ['Operations', 'Finance & Accounts', 'Engineering'];
  const departments: Department[] = [];
  for (const name of deptNames) {
    let dept = await deptRepo.findOne({ where: { name } });
    if (!dept) {
      dept = await deptRepo.save(deptRepo.create({ name }));
    }
    departments.push(dept);
  }
  const [operations, finance, engineering] = departments;

  // ── Branches ────────────────────────────────────────────────────────────────
  console.log('Creating/Updating branches…');
  const branchesData = [
    { name: 'Accra HQ', latitude: 5.6037, longitude: -0.187, allowedRadius: 100 },
    { name: 'Kumasi Office', latitude: 6.6885, longitude: -1.6244, allowedRadius: 100 },
  ];
  const branches: Branch[] = [];
  for (const bData of branchesData) {
    let branch = await branchRepo.findOne({ where: { name: bData.name } });
    if (!branch) {
      branch = await branchRepo.save(branchRepo.create(bData));
    }
    branches.push(branch);
  }
  const [accraHQ, kumasiOffice] = branches;

  // ── Shifts ──────────────────────────────────────────────────────────────────
  console.log('Creating/Updating shifts…');
  const shiftsData = [
    { name: 'Morning Shift', startTime: '08:00', endTime: '17:00', graceMinutes: 15 },
    { name: 'Evening Shift', startTime: '14:00', endTime: '22:00', graceMinutes: 10 },
  ];
  const shifts: Shift[] = [];
  for (const sData of shiftsData) {
    let shift = await shiftRepo.findOne({ where: { name: sData.name } });
    if (!shift) {
      shift = await shiftRepo.save(shiftRepo.create(sData));
    }
    shifts.push(shift);
  }
  const [morningShift, eveningShift] = shifts;

  // ── Users & Employees ────────────────────────────────────────────────────────
  console.log('Creating users and employee profiles…');

  const usersData = [
    {
      fullName: 'Kwame Asante',
      email: 'kwame@tkclocking.dev',
      phone: '+233244000001',
      password: 'Admin@1234',
      role: UserRole.SUPER_ADMIN,
      employeeCode: 'TK-0001',
      department: operations,
      branch: accraHQ,
      shift: morningShift,
      position: 'System Administrator',
    },
    {
      fullName: 'Abena Mensah',
      email: 'abena@tkclocking.dev',
      phone: '+233244000002',
      password: 'HrAdmin@1234',
      role: UserRole.HR_ADMIN,
      employeeCode: 'TK-0002',
      department: finance,
      branch: accraHQ,
      shift: morningShift,
      position: 'HR Manager',
    },
    {
      fullName: 'Kofi Boateng',
      email: 'kofi@tkclocking.dev',
      phone: '+233244000003',
      password: 'Supervisor@1234',
      role: UserRole.SUPERVISOR,
      employeeCode: 'TK-0003',
      department: engineering,
      branch: accraHQ,
      shift: morningShift,
      position: 'Engineering Supervisor',
    },
    {
      fullName: 'Ama Owusu',
      email: 'ama@tkclocking.dev',
      phone: '+233244000004',
      password: 'Employee@1234',
      role: UserRole.EMPLOYEE,
      employeeCode: 'TK-0004',
      department: engineering,
      branch: accraHQ,
      shift: morningShift,
      position: 'Software Engineer',
    },
    {
      fullName: 'Yaw Darko',
      email: 'yaw@tkclocking.dev',
      phone: '+233244000005',
      password: 'Employee@1234',
      role: UserRole.EMPLOYEE,
      employeeCode: 'TK-0005',
      department: operations,
      branch: kumasiOffice,
      shift: eveningShift,
      position: 'Operations Officer',
    },
  ];

  for (const data of usersData) {
    // Skip if user already exists, but check if employee profile exists.
    let user = await userRepo.findOne({ where: { email: data.email } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          passwordHash: await hash(data.password),
          role: data.role,
        }),
      );
      console.log(`  ✅ Created user: ${data.fullName}`);
    } else {
      console.log(`  🔄  User already exists: ${data.fullName}`);
    }

    let emp = await employeeRepo.findOne({ where: { user: { id: user.id } } });
    if (!emp) {
      emp = await employeeRepo.save(
        employeeRepo.create({
          user,
          employeeCode: data.employeeCode,
          department: data.department,
          branch: data.branch,
          shift: (data as any).shift,
          position: data.position,
          hireDate: new Date('2024-01-01'),
          status: EmployeeStatus.ACTIVE,
        }),
      );
      console.log(`  ✅ Created employee profile for: ${data.fullName}`);
    } else {
      // Update existing employee
      emp.shift = (data as any).shift;
      emp.department = data.department;
      emp.branch = data.branch;
      await employeeRepo.save(emp);
      console.log(`  🔄  Updated employee profile for: ${data.fullName}`);
    }
  }

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('─────────────────────────────────────────');
  console.log('Test credentials:');
  console.log('  Super Admin : kwame@tkclocking.dev  / Admin@1234');
  console.log('  HR Admin    : abena@tkclocking.dev  / HrAdmin@1234');
  console.log('  Supervisor  : kofi@tkclocking.dev   / Supervisor@1234');
  console.log('  Employee    : ama@tkclocking.dev     / Employee@1234');
  console.log('  Employee    : yaw@tkclocking.dev     / Employee@1234');
  console.log('─────────────────────────────────────────\n');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
