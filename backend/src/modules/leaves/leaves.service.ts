import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from './leave-request.entity';
import { Employee } from '../employees/employee.entity';
import { User } from '../users/user.entity';
import { LeaveStatus, UserRole } from '../../common/enums';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly auditService: AuditService,
  ) {}

  // ── Employee Actions ──────────────────────────────────────────────────────

  /** Apply for leave. Any employee can do this for themselves. */
  async requestLeave(
    userId: string,
    data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
    },
  ): Promise<LeaveRequest> {
    const employee = await this.employeeRepo
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!employee) throw new NotFoundException('Employee profile not found.');

    const leave = this.leaveRepo.create({
      employee,
      leaveType: data.leaveType as any,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      status: LeaveStatus.PENDING,
    });
    return this.leaveRepo.save(leave);
  }

  /** Cancel a pending leave request (only by the owner). */
  async cancelLeave(leaveId: string, userId: string): Promise<LeaveRequest> {
    const leave = await this._findById(leaveId);
    if (leave.employee.user.id !== userId) {
      throw new ForbiddenException('You cannot cancel someone else\'s leave.');
    }
    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenException('Only PENDING leaves can be cancelled.');
    }
    leave.status = LeaveStatus.CANCELLED;
    return this.leaveRepo.save(leave);
  }

  /** Get leave requests for the currently logged-in employee. */
  async findMyLeaves(userId: string): Promise<LeaveRequest[]> {
    return this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'emp')
      .leftJoinAndSelect('emp.user', 'user')
      .leftJoinAndSelect('leave.reviewedBy', 'reviewer')
      .where('user.id = :userId', { userId })
      .orderBy('leave.createdAt', 'DESC')
      .getMany();
  }

  // ── Admin Actions ─────────────────────────────────────────────────────────

  /** Get all leave requests (admin/HR). */
  async findAll(status?: LeaveStatus): Promise<LeaveRequest[]> {
    const qb = this.leaveRepo
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'emp')
      .leftJoinAndSelect('emp.user', 'user')
      .leftJoinAndSelect('emp.branch', 'branch')
      .leftJoinAndSelect('emp.department', 'department')
      .leftJoinAndSelect('leave.reviewedBy', 'reviewer')
      .orderBy('leave.createdAt', 'DESC');

    if (status) qb.where('leave.status = :status', { status });

    return qb.getMany();
  }

  /** Get all leaves for a specific employee (admin view). */
  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRepo.find({
      where: { employee: { id: employeeId } },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get leaves that overlap with a date range (used by report service). */
  async findApprovedInRange(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<LeaveRequest[]> {
    return this.leaveRepo
      .createQueryBuilder('leave')
      .where('leave.employee_id = :employeeId', { employeeId })
      .andWhere('leave.status = :status', { status: LeaveStatus.APPROVED })
      .andWhere('leave.start_date <= :endDate', { endDate })
      .andWhere('leave.end_date >= :startDate', { startDate })
      .getMany();
  }

  /** Approve or reject a leave request. */
  async reviewLeave(
    leaveId: string,
    reviewer: User,
    decision: { status: LeaveStatus.APPROVED | LeaveStatus.REJECTED; reviewNote?: string },
  ): Promise<LeaveRequest> {
    const leave = await this._findById(leaveId);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenException('Only PENDING leave requests can be reviewed.');
    }

    const oldStatus = leave.status;
    leave.status = decision.status;
    leave.reviewedBy = reviewer;
    leave.reviewNote = decision.reviewNote ?? undefined;

    const saved = await this.leaveRepo.save(leave);

    await this.auditService.log({
      user: reviewer,
      action: `LEAVE_${decision.status}`,
      module: 'LEAVES',
      targetId: leaveId,
      oldValues: { status: oldStatus },
      newValues: { status: decision.status, reviewNote: decision.reviewNote },
    });

    return saved;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async _findById(id: string): Promise<LeaveRequest> {
    const leave = await this.leaveRepo.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'reviewedBy'],
    });
    if (!leave) throw new NotFoundException('Leave request not found.');
    return leave;
  }
}
