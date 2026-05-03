import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLog } from './attendance-log.entity';
import { EmployeesService } from '../employees/employees.service';
import { BranchesService } from '../branches/branches.service';
import { HolidaysService } from '../holidays/holidays.service';
import { AcademicCalendarService } from '../academic-calendar/academic-calendar.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { QrClockDto } from './dto/qr-clock.dto';
import { AttendanceType, UserRole } from '../../common/enums';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceLog)
    private readonly repo: Repository<AttendanceLog>,
    private readonly employees: EmployeesService,
    private readonly branches: BranchesService,
    private readonly holidays: HolidaysService,
    private readonly academicCalendar: AcademicCalendarService,
  ) {}

  // ── Record single event ───────────────────────────────────────────────────
  async record(userId: string, dto: RecordAttendanceDto): Promise<AttendanceLog> {
    const employee = await this.employees.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException('No employee profile found for this user.');
    }

    const now = dto.timestamp ? new Date(dto.timestamp) : new Date();

    // ── Non-working day guard ─────────────────────────────────────────────
    const dayStatus = await this._checkNonWorkingDay(now);
    if (dayStatus.isNonWorking) {
      throw new BadRequestException(
        `Action denied: Today is a ${dayStatus.name}. Clocking is not allowed on non-working days.`,
      );
    }

    // ── Determine the current working day boundary ─────────────────────────
    // "Today" for attendance purposes is the calendar day of 'now'.
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch all of today's logs for this employee, oldest first.
    const todayLogs = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.timestamp >= :dayStart', { dayStart })
      .andWhere('log.timestamp <= :dayEnd', { dayEnd })
      .orderBy('log.timestamp', 'ASC')
      .getMany();

    const hasClockedInToday = todayLogs.some(l => l.type === AttendanceType.CLOCK_IN);
    const hasClockOutToday  = todayLogs.some(l => l.type === AttendanceType.CLOCK_OUT);

    // ── State-machine validation ──────────────────────────────────────────
    switch (dto.type) {
      case AttendanceType.CLOCK_IN: {
        // Rule: Only one clock-in per working day.
        if (hasClockedInToday) {
          throw new BadRequestException(
            'You have already clocked in today. You cannot clock in again until the next working day.',
          );
        }
        break;
      }

      case AttendanceType.CLOCK_OUT: {
        // Rule: Must have clocked in first.
        if (!hasClockedInToday) {
          throw new BadRequestException(
            'You have not clocked in today. Please clock in before clocking out.',
          );
        }
        // Rule: Cannot clock out if already clocked out.
        if (hasClockOutToday) {
          throw new BadRequestException(
            'You have already clocked out today.',
          );
        }
        // Rule: Cannot clock out while on a break (last relevant event is BREAK_IN).
        const lastRelevant = [...todayLogs]
          .reverse()
          .find(l => [
            AttendanceType.CLOCK_IN,
            AttendanceType.CLOCK_OUT,
            AttendanceType.BREAK_IN,
            AttendanceType.BREAK_OUT,
          ].includes(l.type));
        if (lastRelevant?.type === AttendanceType.BREAK_IN) {
          throw new BadRequestException(
            'You are currently on a break. Please end your break before clocking out.',
          );
        }

        // Rule: Early clock-out warning (soft block — user can override with forceEarlyOut).
        if (!dto.forceEarlyOut) {
          const fullEmp = await this.employees.findById(employee.id);
          const shift = fullEmp?.shift;
          if (shift) {
            const [eHours, eMins] = shift.endTime.split(':').map(Number);
            const shiftEnd = new Date(now);
            shiftEnd.setHours(eHours, eMins, 0, 0);

            if (now < shiftEnd) {
              const remainingMs = shiftEnd.getTime() - now.getTime();
              const remainingMins = Math.round(remainingMs / 60_000);
              const hours = Math.floor(remainingMins / 60);
              const mins  = remainingMins % 60;
              const timeLeft = hours > 0
                ? `${hours}h ${mins}m`
                : `${mins} minute${mins !== 1 ? 's' : ''}`;

              throw new BadRequestException(
                JSON.stringify({
                  code: 'EARLY_CLOCK_OUT',
                  message: `Your shift ends at ${shift.endTime}. You still have ${timeLeft} remaining. Are you sure you want to clock out early?`,
                  remainingMinutes: remainingMins,
                }),
              );
            }
          }
        }
        break;
      }

      case AttendanceType.BREAK_IN: {
        // Rule: Must have clocked in first.
        if (!hasClockedInToday) {
          throw new BadRequestException(
            'You have not clocked in today. You must clock in before starting a break.',
          );
        }
        // Rule: Cannot start a break if already on a break.
        const lastBreakRelevant = [...todayLogs]
          .reverse()
          .find(l => [AttendanceType.BREAK_IN, AttendanceType.BREAK_OUT, AttendanceType.CLOCK_OUT].includes(l.type));
        if (lastBreakRelevant?.type === AttendanceType.BREAK_IN) {
          throw new BadRequestException(
            'You are already on a break. Please end your current break before starting a new one.',
          );
        }
        // Rule: Cannot start a break after clocking out.
        if (hasClockOutToday) {
          throw new BadRequestException(
            'You have already clocked out for the day. You cannot start a break.',
          );
        }
        break;
      }

      case AttendanceType.BREAK_OUT: {
        // Rule: Must have clocked in first.
        if (!hasClockedInToday) {
          throw new BadRequestException(
            'You have not clocked in today. You must clock in before ending a break.',
          );
        }
        // Rule: Must be on a break to end one.
        const lastBreakOutRelevant = [...todayLogs]
          .reverse()
          .find(l => [AttendanceType.BREAK_IN, AttendanceType.BREAK_OUT, AttendanceType.CLOCK_IN].includes(l.type));
        if (!lastBreakOutRelevant || lastBreakOutRelevant.type !== AttendanceType.BREAK_IN) {
          throw new BadRequestException(
            'You are not currently on a break. Please start a break before ending one.',
          );
        }
        // Rule: Cannot end a break after clocking out.
        if (hasClockOutToday) {
          throw new BadRequestException(
            'You have already clocked out for the day. You cannot end a break.',
          );
        }
        break;
      }
    }

    // ── Geofence validation ───────────────────────────────────────────────
    const branchId = dto.branchId ?? employee.branch?.id;
    let branch = branchId ? await this.branches.findById(branchId).catch(() => null) : null;

    if (branch?.latitude && dto.latitude && dto.longitude) {
      const dist = this._haversine(
        dto.latitude, dto.longitude,
        Number(branch.latitude), Number(branch.longitude),
      );
      if (dist > branch.allowedRadius) {
        throw new BadRequestException(
          `You are ${Math.round(dist)}m from ${branch.name} (limit: ${branch.allowedRadius}m).`,
        );
      }
    }

    // ── Duplicate prevention: no two same-type events within 1 minute ─────
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    const duplicate = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.type = :type', { type: dto.type })
      .andWhere('log.timestamp > :cutoff', { cutoff: oneMinuteAgo })
      .getOne();

    if (duplicate) {
      throw new BadRequestException('Duplicate attendance event detected. Please wait a moment before trying again.');
    }

    const log = this.repo.create({
      employee,
      branch: branch ?? undefined,
      type: dto.type,
      timestamp: now,
      latitude: dto.latitude,
      longitude: dto.longitude,
      deviceId: dto.deviceId,
      isOfflineSync: dto.isOfflineSync ?? false,
    });

    return this.repo.save(log);
  }

  // ── Batch offline sync ────────────────────────────────────────────────────
  async syncOffline(userId: string, dto: SyncOfflineDto): Promise<{ synced: number }> {
    let synced = 0;
    for (const record of dto.records) {
      try {
        await this.record(userId, { ...record, isOfflineSync: true });
        synced++;
      } catch {
        // Skip duplicates / validation errors in batch; continue the rest.
      }
    }
    return { synced };
  }

  // ── QR code clock-in ──────────────────────────────────────────────────────
  async recordViaQr(userId: string, dto: QrClockDto): Promise<AttendanceLog> {
    const employee = await this.employees.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException('No employee profile found for this user.');
    }

    const now = dto.timestamp ? new Date(dto.timestamp) : new Date();

    const dayStatus = await this._checkNonWorkingDay(now);
    if (dayStatus.isNonWorking) {
      throw new BadRequestException(
        `Action denied: Today is a ${dayStatus.name}. Clocking is not allowed on non-working days.`,
      );
    }

    const branch = await this.branches.findByQrCode(dto.qrCode);
    if (!branch) throw new BadRequestException('Invalid QR code.');

    if (employee.branch?.id !== branch.id) {
      throw new BadRequestException('This QR code does not belong to your assigned branch.');
    }

    // ── Same state-machine as record() ───────────────────────────────────
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.timestamp >= :dayStart', { dayStart })
      .andWhere('log.timestamp <= :dayEnd', { dayEnd })
      .orderBy('log.timestamp', 'ASC')
      .getMany();

    const hasClockedInToday = todayLogs.some(l => l.type === AttendanceType.CLOCK_IN);
    const hasClockOutToday  = todayLogs.some(l => l.type === AttendanceType.CLOCK_OUT);

    switch (dto.type) {
      case AttendanceType.CLOCK_IN: {
        if (hasClockedInToday) {
          throw new BadRequestException(
            'You have already clocked in today. You cannot clock in again until the next working day.',
          );
        }
        break;
      }
      case AttendanceType.CLOCK_OUT: {
        if (!hasClockedInToday) throw new BadRequestException('You have not clocked in today. Please clock in before clocking out.');
        if (hasClockOutToday)   throw new BadRequestException('You have already clocked out today.');
        const last = [...todayLogs].reverse().find(l => [AttendanceType.CLOCK_IN, AttendanceType.CLOCK_OUT, AttendanceType.BREAK_IN, AttendanceType.BREAK_OUT].includes(l.type));
        if (last?.type === AttendanceType.BREAK_IN) throw new BadRequestException('You are currently on a break. Please end your break before clocking out.');

        // Rule: Early clock-out warning (soft block — user can override with forceEarlyOut).
        if (!dto.forceEarlyOut) {
          const fullEmp = await this.employees.findById(employee.id);
          const shift = fullEmp?.shift;
          if (shift) {
            const [eHours, eMins] = shift.endTime.split(':').map(Number);
            const shiftEnd = new Date(now);
            shiftEnd.setHours(eHours, eMins, 0, 0);

            if (now < shiftEnd) {
              const remainingMs = shiftEnd.getTime() - now.getTime();
              const remainingMins = Math.round(remainingMs / 60_000);
              const hours = Math.floor(remainingMins / 60);
              const mins  = remainingMins % 60;
              const timeLeft = hours > 0
                ? `${hours}h ${mins}m`
                : `${mins} minute${mins !== 1 ? 's' : ''}`;

              throw new BadRequestException(
                JSON.stringify({
                  code: 'EARLY_CLOCK_OUT',
                  message: `Your shift ends at ${shift.endTime}. You still have ${timeLeft} remaining. Are you sure you want to clock out early?`,
                  remainingMinutes: remainingMins,
                }),
              );
            }
          }
        }
        break;
      }
      case AttendanceType.BREAK_IN: {
        if (!hasClockedInToday) throw new BadRequestException('You must clock in before starting a break.');
        if (hasClockOutToday)   throw new BadRequestException('You have already clocked out. You cannot start a break.');
        const last = [...todayLogs].reverse().find(l => [AttendanceType.BREAK_IN, AttendanceType.BREAK_OUT, AttendanceType.CLOCK_OUT].includes(l.type));
        if (last?.type === AttendanceType.BREAK_IN) throw new BadRequestException('You are already on a break.');
        break;
      }
      case AttendanceType.BREAK_OUT: {
        if (!hasClockedInToday) throw new BadRequestException('You must clock in before ending a break.');
        if (hasClockOutToday)   throw new BadRequestException('You have already clocked out. You cannot end a break.');
        const last = [...todayLogs].reverse().find(l => [AttendanceType.BREAK_IN, AttendanceType.BREAK_OUT, AttendanceType.CLOCK_IN].includes(l.type));
        if (!last || last.type !== AttendanceType.BREAK_IN) throw new BadRequestException('You are not currently on a break.');
        break;
      }
    }

    // GPS geofence validation
    if (branch.latitude && dto.latitude && dto.longitude) {
      const dist = this._haversine(
        dto.latitude, dto.longitude,
        Number(branch.latitude), Number(branch.longitude),
      );
      if (dist > branch.allowedRadius) {
        throw new BadRequestException(
          `You are ${Math.round(dist)}m from ${branch.name} (limit: ${branch.allowedRadius}m).`,
        );
      }
    }

    // Duplicate prevention
    const oneMinuteAgo = new Date(now.getTime() - 60_000);
    const duplicate = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.type = :type', { type: dto.type })
      .andWhere('log.timestamp > :cutoff', { cutoff: oneMinuteAgo })
      .getOne();

    if (duplicate) {
      throw new BadRequestException('Duplicate attendance event detected. Please wait a moment before trying again.');
    }

    const log = this.repo.create({
      employee,
      branch: branch ?? undefined,
      type: dto.type,
      timestamp: now,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isOfflineSync: false,
    });

    return this.repo.save(log);
  }

  // ── History ───────────────────────────────────────────────────────────────
  async getHistory(
    userId: string,
    userRole: UserRole,
    page = 1,
    limit = 20,
  ): Promise<{ data: AttendanceLog[]; total: number }> {
    const isAdmin =
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.HR_ADMIN ||
      userRole === UserRole.SUPERVISOR;

    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.employee', 'emp')
      .leftJoinAndSelect('emp.user', 'user')
      .leftJoinAndSelect('log.branch', 'branch')
      .orderBy('log.timestamp', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (!isAdmin) {
      const employee = await this.employees.findByUserId(userId);
      if (!employee) throw new NotFoundException('Employee profile not found.');
      qb.where('emp.id = :empId', { empId: employee.id });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── Home Data ─────────────────────────────────────────────────────────────
  async getHomeData(userId: string): Promise<any> {
    const employee = await this.employees.findByUserId(userId);
    if (!employee) throw new NotFoundException('Employee not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfWeek = new Date(today);
    const day = firstDayOfWeek.getDay();
    const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);

    // 1. Last Activity
    const lastLog = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .orderBy('log.timestamp', 'DESC')
      .getOne();

    let isClockedIn = false;
    let clockedInTime: Date | null = null;
    let forgotToClockOut = false;
    // 'none' | 'late' | 'persistent_late'
    let lateStatus: 'none' | 'late' | 'persistent_late' = 'none';
    let isShiftOver = false;
    let isAbsentToday = false;
    let holidayName: string | null = null;
    let isWeekend = false;
    let isVacation = false;
    let vacationName: string | null = null;

    // Check non-working day
    const dayStatus = await this._checkNonWorkingDay(new Date());
    if (dayStatus.isNonWorking) {
      if (dayStatus.type === 'weekend') isWeekend = true;
      else if (dayStatus.type === 'holiday') holidayName = dayStatus.name;
      else if (dayStatus.type === 'break' || dayStatus.type === 'vacation') {
        isVacation = true;
        vacationName = dayStatus.name;
      }
    }

    // Determine current clock-in status
    if (lastLog && (lastLog.type === AttendanceType.CLOCK_IN || lastLog.type === AttendanceType.BREAK_OUT)) {
      isClockedIn = true;
      clockedInTime = lastLog.timestamp;
    }

    // 2. Today's logs
    const todayLogs = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.timestamp >= :today', { today })
      .orderBy('log.timestamp', 'ASC')
      .getMany();

    const hasClockedInToday = todayLogs.some(l => l.type === AttendanceType.CLOCK_IN);

    let todayHours = 0;
    if (todayLogs.length > 0) {
      const clockIn = todayLogs.find(l => l.type === AttendanceType.CLOCK_IN);
      const clockOut = todayLogs.find(l => l.type === AttendanceType.CLOCK_OUT);

      if (clockIn) {
        if (clockOut) {
          todayHours = (clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / 3600000;
        } else if (isClockedIn) {
          todayHours = (new Date().getTime() - clockIn.timestamp.getTime()) / 3600000;
        }
      }
    }

    // ── Shift-aware late / forgot-to-clock-out logic ──────────────────────
    const fullEmp = await this.employees.findById(employee.id);
    const shift = fullEmp?.shift;

    if (shift) {
      const now = new Date();

      const [sHours, sMins] = shift.startTime.split(':').map(Number);
      const [eHours, eMins] = shift.endTime.split(':').map(Number);

      const shiftStart = new Date(today);
      shiftStart.setHours(sHours, sMins + (shift.graceMinutes || 0), 0, 0);

      const shiftEnd = new Date(today);
      shiftEnd.setHours(eHours, eMins, 0, 0);

      // The window 1 hour after shift end — for "forgot to clock out" detection
      const forgotCutoff = new Date(shiftEnd.getTime() + 60 * 60 * 1000);

      // Track whether the shift window has ended
      isShiftOver = now > shiftEnd;

      // Late alert: only show while shift is still ongoing and employee never clocked in today
      if (!hasClockedInToday && now > shiftStart && now <= shiftEnd && !dayStatus.isNonWorking) {
        const minutesLate = (now.getTime() - shiftStart.getTime()) / 60000;
        lateStatus = minutesLate > 180 ? 'persistent_late' : 'late';
      }

      // Absent today: shift is over and employee never clocked in at all
      if (isShiftOver && !hasClockedInToday && !dayStatus.isNonWorking) {
        isAbsentToday = true;
      }

      // Forgot to clock out: employee is still "clocked in" (no CLOCK_OUT today) and 
      // working hours ended more than 1 hour ago
      if (isClockedIn && hasClockedInToday && now > forgotCutoff) {
        const hasClockOut = todayLogs.some(l => l.type === AttendanceType.CLOCK_OUT);
        if (!hasClockOut) {
          forgotToClockOut = true;
          // "forgot to clock out" overrides the "still clocked in" state for banner priority
          isClockedIn = false;
        }
      }

      // Legacy: clocked in since a previous day (safety net)
      if (isClockedIn && clockedInTime && clockedInTime < today) {
        forgotToClockOut = true;
        isClockedIn = false;
      }
    } else {
      // No shift assigned — keep legacy "clocked in since yesterday" logic only
      if (isClockedIn && clockedInTime && clockedInTime < today) {
        forgotToClockOut = true;
        isClockedIn = false;
      }
    }

    // 3. This Week's Hours
    const weekLogs = await this.repo
      .createQueryBuilder('log')
      .where('log.employee = :empId', { empId: employee.id })
      .andWhere('log.timestamp >= :weekStart', { weekStart: firstDayOfWeek })
      .orderBy('log.timestamp', 'ASC')
      .getMany();

    let weekHours = 0;
    let daysWorkedThisWeek = 0;
    const logsByDay: Record<string, AttendanceLog[]> = {};
    weekLogs.forEach(log => {
      const logDay = log.timestamp.toISOString().substring(0, 10);
      if (!logsByDay[logDay]) logsByDay[logDay] = [];
      logsByDay[logDay].push(log);
    });

    Object.values(logsByDay).forEach(dayLogs => {
      const cIn = dayLogs.find(l => l.type === AttendanceType.CLOCK_IN);
      const cOut = dayLogs.find(l => l.type === AttendanceType.CLOCK_OUT);
      if (cIn) {
        daysWorkedThisWeek++;
        if (cOut) {
          weekHours += (cOut.timestamp.getTime() - cIn.timestamp.getTime()) / 3600000;
        }
      }
    });

    return {
      lastActivity: lastLog ? {
        type: lastLog.type,
        timestamp: lastLog.timestamp,
      } : null,
      isClockedIn,
      clockedInTime,
      forgotToClockOut,
      // Backwards-compatible: isLateToday is true for either late variant
      isLateToday: lateStatus !== 'none',
      lateStatus,
      isShiftOver,
      isAbsentToday,
      todayHours: Number(todayHours.toFixed(2)),
      weekHours: Number(weekHours.toFixed(2)),
      daysWorkedThisWeek,
      isHoliday: holidayName !== null,
      holidayName,
      isWeekend,
      isVacation,
      vacationName,
    };
  }

  // ── Live attendance (for dashboard) ──────────────────────────────────────
  async getLive(): Promise<AttendanceLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.employee', 'emp')
      .leftJoinAndSelect('emp.user', 'user')
      .leftJoinAndSelect('log.branch', 'branch')
      .where('log.timestamp >= :today', { today })
      .orderBy('log.timestamp', 'DESC')
      .getMany();
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const dayStatus = await this._checkNonWorkingDay(now);

    const logs = await this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.employee', 'emp')
      .leftJoinAndSelect('emp.shift', 'shift')
      .where('log.timestamp >= :today', { today })
      .orderBy('log.timestamp', 'ASC')
      .getMany();

    // Group logs by employee
    const employeeLogs: Record<string, AttendanceLog[]> = {};
    logs.forEach(log => {
      if (!employeeLogs[log.employee.id]) {
        employeeLogs[log.employee.id] = [];
      }
      employeeLogs[log.employee.id].push(log);
    });

    let totalUniqueAttendance = 0;
    let currentlyOnSite = 0;
    let lateArrivals = 0;
    let earlyOuts = 0;
    let forgotClockOut = 0;

    Object.values(employeeLogs).forEach(userLogs => {
      const clockIns = userLogs.filter(l => l.type === AttendanceType.CLOCK_IN);
      if (clockIns.length > 0) {
        totalUniqueAttendance++;
        
        const firstClockIn = clockIns[0];
        const emp = firstClockIn.employee;
        if (emp?.shift) {
          const [sHours, sMins] = emp.shift.startTime.split(':').map(Number);
          const shiftStart = new Date(today);
          shiftStart.setHours(sHours, sMins + (emp.shift.graceMinutes || 0), 0, 0);
          
          if (firstClockIn.timestamp > shiftStart && !dayStatus.isNonWorking) {
            lateArrivals++;
          }
        }
      }

      const clockOuts = userLogs.filter(l => l.type === AttendanceType.CLOCK_OUT);
      if (clockIns.length > 0) {
        const emp = clockIns[0].employee;
        if (emp?.shift) {
          const [eHours, eMins] = emp.shift.endTime.split(':').map(Number);
          const shiftEnd = new Date(today);
          shiftEnd.setHours(eHours, eMins, 0, 0);
          
          if (clockOuts.length > 0) {
            const lastClockOut = clockOuts[clockOuts.length - 1];
            if (lastClockOut.timestamp < shiftEnd) {
              earlyOuts++;
            }
          } else {
            const forgotCutoff = new Date(shiftEnd.getTime() + 60 * 60 * 1000);
            if (now > forgotCutoff) {
              forgotClockOut++;
            }
          }
        }
      }

      // Check their latest status
      const latestLog = userLogs[userLogs.length - 1];
      if (latestLog.type === AttendanceType.CLOCK_IN || latestLog.type === AttendanceType.BREAK_OUT) {
        currentlyOnSite++;
      }
    });

    let absentToday = 0;
    if (!dayStatus.isNonWorking) {
      const allEmployees = await this.employees.findAll();
      allEmployees.forEach(emp => {
        if (!employeeLogs[emp.id] || !employeeLogs[emp.id].some(l => l.type === AttendanceType.CLOCK_IN)) {
          if (emp.shift) {
            const [sHours, sMins] = emp.shift.startTime.split(':').map(Number);
            const shiftStart = new Date(today);
            shiftStart.setHours(sHours, sMins + (emp.shift.graceMinutes || 0), 0, 0);
            
            if (now > shiftStart) {
              absentToday++;
            }
          }
        }
      });
    }

    return {
      totalUniqueAttendance,
      currentlyOnSite,
      lateArrivals,
      absentToday,
      earlyOuts,
      forgotClockOut,
      dayStatus,
    };
  }

  // ── Haversine distance (meters) ───────────────────────────────────────────
  private _haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const dLat = this._rad(lat2 - lat1);
    const dLon = this._rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this._rad(lat1)) * Math.cos(this._rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private _rad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // ── Non-Working Day Checker ───────────────────────────────────────────────
  private async _checkNonWorkingDay(date: Date): Promise<{ isNonWorking: boolean; type: string | null; name: string | null }> {
    // 1. Weekend
    const currentDay = date.getDay();
    if (currentDay === 0 || currentDay === 6) {
      return { isNonWorking: true, type: 'weekend', name: 'Weekend' };
    }

    // 2. Public Holiday
    const holiday = await this.holidays.getHolidayForDate(date);
    if (holiday) {
      return { isNonWorking: true, type: 'holiday', name: holiday.name };
    }

    // 3. Academic Calendar Break
    const breakName = await this.academicCalendar.isBreak(date);
    if (breakName) {
      return { isNonWorking: true, type: 'break', name: breakName };
    }

    // 4. Vacation (Outside any term)
    const term = await this.academicCalendar.getTermForDate(date);
    if (!term) {
      return { isNonWorking: true, type: 'vacation', name: 'Vacation' };
    }

    return { isNonWorking: false, type: null, name: null };
  }
}
