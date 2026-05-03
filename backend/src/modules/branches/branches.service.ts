import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Branch } from './branch.entity';
import { Employee } from '../employees/employee.entity';
import { AttendanceLog } from '../attendance/attendance-log.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly repo: Repository<Branch>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(AttendanceLog)
    private readonly attendanceRepo: Repository<AttendanceLog>,
    private readonly users: UsersService,
  ) {}

  findAll(): Promise<Branch[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Branch> {
    const branch = await this.repo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found.');
    return branch;
  }

  async findByQrCode(qrCode: string): Promise<Branch | null> {
    return this.repo.findOne({ where: { qrCode } });
  }

  create(data: Partial<Branch>): Promise<Branch> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Branch>): Promise<Branch> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    // Unlink employees
    await this.employeeRepo
      .createQueryBuilder()
      .update()
      .set({ branch: null as any })
      .where('branch_id = :id', { id })
      .execute();

    // Unlink attendance logs
    await this.attendanceRepo
      .createQueryBuilder()
      .update()
      .set({ branch: null as any })
      .where('branch_id = :id', { id })
      .execute();

    await this.repo.delete(id);
  }

  async generateQrCode(id: string, userId: string, password: string): Promise<Branch> {
    const user = await this.users.findById(userId);
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Incorrect password. QR code was not regenerated.');
    }

    const branch = await this.findById(id);
    branch.qrCode = randomBytes(16).toString('hex');
    branch.qrCodeUpdatedAt = new Date();
    return this.repo.save(branch);
  }
}
