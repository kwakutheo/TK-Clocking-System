import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeaveRequest } from './leave-request.entity';
import { Employee } from '../employees/employee.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaveStatus } from '../../common/enums';
import { User } from '../users/user.entity';

describe('LeavesService', () => {
  let service: LeavesService;

  const mockLeaveRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockEmployeeRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    sendSilentSyncToToken: jest.fn().mockResolvedValue(true),
    sendPushToToken: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        { provide: getRepositoryToken(LeaveRequest), useValue: mockLeaveRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LeavesService>(LeavesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── reviewLeave ────────────────────────────────────────────────────────────

  describe('reviewLeave', () => {
    const reviewerId = 'reviewer-uuid';
    const leaveId = 'leave-uuid';
    const reviewer = { id: reviewerId } as User;

    const buildLeave = (token?: string): LeaveRequest => {
      const emp = new Employee();
      const user = new User();
      user.fcmToken = token ?? null;
      (emp as any).user = user;

      const leave = new LeaveRequest();
      leave.id = leaveId;
      leave.status = LeaveStatus.PENDING;
      (leave as any).employee = emp;
      return leave;
    };

    it('should approve a PENDING leave request and save it', async () => {
      const leave = buildLeave();
      mockLeaveRepo.findOne.mockResolvedValue(leave);
      mockLeaveRepo.save.mockResolvedValue({ ...leave, status: LeaveStatus.APPROVED });

      const result = await service.reviewLeave(leaveId, reviewer, {
        status: LeaveStatus.APPROVED,
        reviewNote: 'Approved!',
      });

      expect(mockLeaveRepo.save).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(LeaveStatus.APPROVED);
    });

    it('should reject a PENDING leave request and save it', async () => {
      const leave = buildLeave();
      mockLeaveRepo.findOne.mockResolvedValue(leave);
      mockLeaveRepo.save.mockResolvedValue({ ...leave, status: LeaveStatus.REJECTED });

      const result = await service.reviewLeave(leaveId, reviewer, {
        status: LeaveStatus.REJECTED,
      });

      expect(result.status).toBe(LeaveStatus.REJECTED);
    });

    it('should throw ForbiddenException if leave is not PENDING', async () => {
      const leave = buildLeave();
      leave.status = LeaveStatus.APPROVED; // Already processed
      mockLeaveRepo.findOne.mockResolvedValue(leave);

      await expect(
        service.reviewLeave(leaveId, reviewer, { status: LeaveStatus.REJECTED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if leave does not exist', async () => {
      mockLeaveRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reviewLeave('non-existent-id', reviewer, { status: LeaveStatus.APPROVED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send silent sync + push notification if employee has FCM token', async () => {
      const leave = buildLeave('valid-fcm-token');
      mockLeaveRepo.findOne.mockResolvedValue(leave);
      mockLeaveRepo.save.mockResolvedValue({ ...leave, status: LeaveStatus.APPROVED });

      await service.reviewLeave(leaveId, reviewer, { status: LeaveStatus.APPROVED });

      expect(mockNotificationsService.sendSilentSyncToToken).toHaveBeenCalledWith(
        'valid-fcm-token',
        'refresh_dashboard',
      );
      expect(mockNotificationsService.sendPushToToken).toHaveBeenCalledWith(
        'valid-fcm-token',
        'Leave Request Update',
        expect.stringContaining('approved'),
      );
    });

    it('should NOT send notifications if employee has no FCM token', async () => {
      const leave = buildLeave(undefined); // No token
      mockLeaveRepo.findOne.mockResolvedValue(leave);
      mockLeaveRepo.save.mockResolvedValue({ ...leave, status: LeaveStatus.APPROVED });

      await service.reviewLeave(leaveId, reviewer, { status: LeaveStatus.APPROVED });

      expect(mockNotificationsService.sendSilentSyncToToken).not.toHaveBeenCalled();
      expect(mockNotificationsService.sendPushToToken).not.toHaveBeenCalled();
    });

    it('should always log an audit entry regardless of FCM token', async () => {
      const leave = buildLeave();
      mockLeaveRepo.findOne.mockResolvedValue(leave);
      mockLeaveRepo.save.mockResolvedValue({ ...leave, status: LeaveStatus.APPROVED });

      await service.reviewLeave(leaveId, reviewer, { status: LeaveStatus.APPROVED });

      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `LEAVE_${LeaveStatus.APPROVED}`,
          module: 'LEAVES',
        }),
      );
    });
  });
});
