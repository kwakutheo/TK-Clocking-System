import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './employee.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { UserRole, EmployeeStatus } from '../../common/enums';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.repo.find({
      order: { employeeCode: 'ASC' },
      relations: ['user', 'department', 'branch', 'shift'],
    });
  }

  async findById(id: string): Promise<Employee> {
    const emp = await this.repo.findOne({
      where: { id },
      relations: ['user', 'department', 'branch', 'shift'],
    });
    if (!emp) throw new NotFoundException('Employee not found.');
    return emp;
  }

  /** Find employee by their user.id (used in auth-gated endpoints). */
  async findByUserId(userId: string): Promise<Employee | null> {
    return this.repo
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.user', 'user')
      .leftJoinAndSelect('emp.branch', 'branch')
      .leftJoinAndSelect('emp.department', 'department')
      .leftJoinAndSelect('emp.shift', 'shift')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async create(data: Partial<Employee>): Promise<Employee> {
    const existing = await this.repo.findOne({
      where: { employeeCode: data.employeeCode },
    });
    if (existing) {
      throw new ConflictException(
        `Employee code '${data.employeeCode}' is already in use.`,
      );
    }
    return this.repo.save(this.repo.create(data));
  }

  private async _generateEmployeeCode(): Promise<string> {
    const prefix = 'TK';
    for (let attempts = 0; attempts < 10; attempts++) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const code = `${prefix}-${num}`;
      const existing = await this.repo.findOne({ where: { employeeCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('Unable to generate a unique employee code. Please try again.');
  }

  async createEmployeeWithUser(payload: {
    fullName: string;
    username: string;
    password: string;
    employeeCode?: string;
    departmentId?: string;
    branchId?: string;
    shiftId?: string;
    position?: string;
    hireDate?: string;
    phone?: string;
    role?: UserRole;
  }): Promise<Employee> {
    const employeeCode = payload.employeeCode ?? await this._generateEmployeeCode();

    const existingCode = await this.repo.findOne({
      where: { employeeCode },
    });
    if (existingCode) {
      throw new ConflictException(
        `Employee code '${employeeCode}' is already in use.`,
      );
    }

    const existingUser = await this.users.findByUsername(payload.username);
    if (existingUser) {
      throw new ConflictException('Username already in use.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const passwordHash = await bcrypt.hash(payload.password, 12);
      const user = queryRunner.manager.create(User, {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone,
        passwordHash,
        role: payload.role ?? UserRole.EMPLOYEE,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);

      const employee = queryRunner.manager.create(Employee, {
        user: savedUser,
        employeeCode,
        position: payload.position,
        hireDate: payload.hireDate ? new Date(payload.hireDate) : undefined,
      } as any);

      if (payload.departmentId) {
        (employee as any).department = { id: payload.departmentId };
      }
      if (payload.branchId) {
        (employee as any).branch = { id: payload.branchId };
      }
      if (payload.shiftId) {
        (employee as any).shift = { id: payload.shiftId };
      }

      const savedEmployee = await queryRunner.manager.save(employee);
      await queryRunner.commitTransaction();
      return savedEmployee;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    data: Omit<Partial<Employee>, 'hireDate' | 'department' | 'branch' | 'shift'> & {
      fullName?: string;
      email?: string;
      phone?: string;
      username?: string;
      role?: UserRole;
      departmentId?: string;
      branchId?: string;
      shiftId?: string;
      hireDate?: string;
      status?: EmployeeStatus;
    },
    adminUser?: User,
  ): Promise<Employee> {
    const emp = await this.findById(id);



    const oldValues = {
      fullName: emp.user.fullName,
      phone: emp.user.phone,
      username: emp.user.username,
      role: emp.user.role,
      position: emp.position,
      status: (emp as any).status,
      shift: emp.shift?.name ?? null,
      branch: emp.branch?.name ?? null,
      department: emp.department?.name ?? null,
    };

    if (data.username && data.username !== emp.user.username) {
      const existing = await this.users.findByUsername(data.username);
      if (existing && existing.id !== emp.user.id) {
        throw new ConflictException('Username already in use.');
      }
    }

    if (data.fullName || data.email || data.phone || data.role || data.username) {
      await this.userRepo.update(emp.user.id, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        username: data.username,
        role: data.role,
      });
    }

    const {
      fullName,
      email,
      phone,
      role,
      username,
      departmentId,
      branchId,
      shiftId,
      hireDate,
      ...employeeData
    } = data;

    if (departmentId !== undefined) (emp as any).department = departmentId ? { id: departmentId } : null;
    if (branchId !== undefined) (emp as any).branch = branchId ? { id: branchId } : null;
    if (shiftId !== undefined) (emp as any).shift = shiftId ? { id: shiftId } : null;
    if (hireDate !== undefined) emp.hireDate = hireDate ? new Date(hireDate) : null as any;
    if (data.status !== undefined) emp.status = data.status as any;
    Object.assign(emp, employeeData);

    await this.repo.save(emp);

    const updatedEmp = await this.findById(id);

    if (adminUser) {
      await this.auditService.log({
        user: adminUser,
        action: 'UPDATE_EMPLOYEE_PROFILE',
        module: 'EMPLOYEES',
        targetId: id,
        oldValues,
        newValues: {
          fullName: updatedEmp.user.fullName,
          phone: updatedEmp.user.phone,
          username: updatedEmp.user.username,
          role: updatedEmp.user.role,
          position: updatedEmp.position,
          status: (updatedEmp as any).status,
          shift: updatedEmp.shift?.name ?? null,
          branch: updatedEmp.branch?.name ?? null,
          department: updatedEmp.department?.name ?? null,
        },
      });
    }

    return updatedEmp;
  }

  async updateProfile(userId: string, data: {
    fullName?: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    username?: string;
    password?: string;
  }): Promise<Employee> {
    const employee = await this.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException('Employee profile not found.');
    }

    if (data.username && data.username !== employee.user.username) {
      const existing = await this.users.findByUsername(data.username);
      if (existing && existing.id !== employee.user.id) {
        throw new ConflictException('Username already in use.');
      }
    }

    const userUpdate: any = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      username: data.username,
    };
    if (data.password) {
      userUpdate.passwordHash = await bcrypt.hash(data.password, 12);
    }

    Object.keys(userUpdate).forEach((key) => {
      if (userUpdate[key] === undefined) delete userUpdate[key];
    });

    if (Object.keys(userUpdate).length > 0) {
      await this.userRepo.update(employee.user.id, userUpdate);
    }
    if (data.photoUrl !== undefined) {
      await this.repo.update(employee.id, { photoUrl: data.photoUrl });
    }

    return this.findById(employee.id);
  }

  async resetPassword(id: string, adminPassword: string, adminUserPayload: { id: string }): Promise<{ pin: string }> {
    const adminUser = await this.users.findById(adminUserPayload.id);
    const isValidAdminPassword = await bcrypt.compare(adminPassword, adminUser.passwordHash);
    if (!isValidAdminPassword) {
      throw new BadRequestException('Invalid admin password. Action not authorized.');
    }

    const emp = await this.findById(id);
    
    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set requiresPasswordChange so the user is forced to change it on their next login
    await this.userRepo.update(emp.user.id, { 
      resetPin: pin,
      requiresPasswordChange: true 
    } as any);

    await this.auditService.log({
      user: adminUser,
      action: 'REQUEST_PASSWORD_RESET',
      module: 'EMPLOYEES',
      targetId: id,
      oldValues: { requiresPasswordChange: false },
      newValues: { requiresPasswordChange: true },
    });

    return { pin };
  }

  async remove(id: string): Promise<void> {
    const emp = await this.findById(id);
    // Delete the user; the employee row cascades because
    // Employee.user has onDelete: 'CASCADE'.
    await this.userRepo.delete(emp.user.id);
  }
}
