import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendanceLog } from '../attendance/attendance-log.entity';
import { Employee } from '../employees/employee.entity';
import { HolidaysService } from '../holidays/holidays.service';
import { AcademicCalendarService } from '../academic-calendar/academic-calendar.service';
import { AttendanceType } from '../../common/enums';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWeekend, 
  format,
  isSameDay,
  isAfter,
  startOfDay,
  parseISO,
  eachMonthOfInterval
} from 'date-fns';

@Injectable()
export class AttendanceReportService {
  constructor(
    @InjectRepository(AttendanceLog)
    private readonly attendanceRepo: Repository<AttendanceLog>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly holidaysService: HolidaysService,
    private readonly academicCalendarService: AcademicCalendarService,
  ) {}

  async getMonthlyReport(employeeId: string, month: number, year: number) {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    return this.getReportForRange(employeeId, startDate, endDate);
  }

  async getTermReport(employeeId: string, termId: string) {
    const term = await this.academicCalendarService.findOneTerm(termId);
    const startDate = parseISO(term.startDate);
    const endDate = parseISO(term.endDate);
    
    const fullReport = await this.getReportForRange(employeeId, startDate, endDate);
    
    // Group by month for "monthly tabs"
    const months: any[] = [];
    const monthsInTerm = eachMonthOfInterval({ start: startDate, end: endDate });
    
    monthsInTerm.forEach(monthDate => {
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthDays = fullReport.days.filter(d => {
        const dDate = parseISO(d.date);
        return dDate >= mStart && dDate <= mEnd;
      });
      
      if (monthDays.length > 0) {
        const mSummary = monthDays.reduce((acc, day) => {
          acc.totalHours += day.hours;
          if (day.status === 'PRESENT' || day.status === 'IN PROGRESS') acc.daysWorked++;
          if (day.status === 'ABSENT') acc.daysAbsent++;
          if (day.isLate) {
            acc.daysLate++;
            acc.totalLateMinutes += day.lateMinutes;
          }
          if (day.isEarlyOut) {
            acc.daysEarlyDeparture++;
            acc.totalEarlyOutMinutes += day.earlyOutMinutes;
          }
          if (day.missingClockOut) {
            acc.daysForgotClockOut++;
          }
          return acc;
        }, {
          totalHours: 0,
          daysWorked: 0,
          daysAbsent: 0,
          daysLate: 0,
          totalLateMinutes: 0,
          daysEarlyDeparture: 0,
          totalEarlyOutMinutes: 0,
          daysForgotClockOut: 0
        });

        months.push({
          name: format(monthDate, 'MMMM yyyy'),
          month: monthDate.getMonth() + 1,
          year: monthDate.getFullYear(),
          summary: {
            ...mSummary,
            totalHours: Number(mSummary.totalHours.toFixed(2))
          },
          days: monthDays
        });
      }
    });

    return {
      ...fullReport,
      term: {
        id: term.id,
        name: term.name,
        academicYear: term.academicYear
      },
      months
    };
  }

  async getReportForRange(employeeId: string, startDate: Date, endDate: Date) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['user', 'shift'],
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const logs = await this.attendanceRepo.find({
      where: {
        employee: { id: employeeId },
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    const holidays = await this.holidaysService.findAll();
    const terms = await this.academicCalendarService.findAllTerms();
    const today = startOfDay(new Date());
    
    let totalHours = 0;
    let daysWorked = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let totalLateMinutes = 0;
    let daysEarlyDeparture = 0;
    let totalEarlyOutMinutes = 0;
    let daysForgotClockOut = 0;

    const registrationDate = employee.hireDate ? new Date(employee.hireDate) : new Date(employee.createdAt);
    registrationDate.setHours(0, 0, 0, 0);

    const reportDays = daysInRange.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => isSameDay(new Date(l.timestamp), day));
      
      const isWeekEnd = isWeekend(day);
      const holiday = holidays.find(h => {
        const hDate = h.date;
        if (h.isRecurring) {
          return hDate.substring(5) === dayStr.substring(5);
        }
        return hDate === dayStr;
      });

      const term = terms.find(t => dayStr >= t.startDate && dayStr <= t.endDate);
      const breakItem = term?.breaks?.find(b => dayStr >= b.startDate && b.endDate);

      const clockIn = dayLogs.find(l => l.type === AttendanceType.CLOCK_IN);
      const clockOut = dayLogs.find(l => l.type === AttendanceType.CLOCK_OUT);

      const isFuture = isAfter(day, today);
      const isToday = isSameDay(day, today);
      
      let status = 'PRESENT';
      let hours = 0;
      let isLate = false;
      let lateMinutes = 0;
      let isEarlyOut = false;
      let earlyOutMinutes = 0;
      let missingClockIn = false;
      let missingClockOut = false;

      if (employee.shift) {
        const shiftStart = this._timeToMinutes(employee.shift.startTime);
        const shiftEnd = this._timeToMinutes(employee.shift.endTime);
        const grace = employee.shift.graceMinutes || 0;

        if (clockIn) {
          const actualIn = clockIn.timestamp.getHours() * 60 + clockIn.timestamp.getMinutes();
          if (actualIn > shiftStart + grace) {
            isLate = true;
            lateMinutes = actualIn - shiftStart;
            daysLate++;
            totalLateMinutes += lateMinutes;
          }
        }

        if (clockOut) {
          const actualOut = clockOut.timestamp.getHours() * 60 + clockOut.timestamp.getMinutes();
          if (actualOut < shiftEnd) {
            isEarlyOut = true;
            earlyOutMinutes = shiftEnd - actualOut;
            daysEarlyDeparture++;
            totalEarlyOutMinutes += earlyOutMinutes;
          }
        }
      }

      if (clockIn || clockOut) {
        daysWorked++;
        
        if (clockIn && employee.shift) {
          const [sHours, sMins] = employee.shift.startTime.split(':').map(Number);
          const [eHours, eMins] = employee.shift.endTime.split(':').map(Number);
          
          const sStart = new Date(day);
          sStart.setHours(sHours, sMins, 0, 0);
          const sEnd = new Date(day);
          sEnd.setHours(eHours, eMins, 0, 0);

          // Start at max(clockIn, shiftStart)
          const calcStart = clockIn.timestamp > sStart ? clockIn.timestamp : sStart;
          
          // End at min(clockOut ?? now, shiftEnd)
          let calcEnd: Date;
          if (clockOut) {
            calcEnd = clockOut.timestamp < sEnd ? clockOut.timestamp : sEnd;
          } else if (isToday) {
            calcEnd = new Date() > sEnd ? sEnd : new Date();
            status = 'IN PROGRESS';
          } else if (!isFuture) {
            calcEnd = sEnd;
            status = 'PRESENT';
            missingClockOut = true;
            daysForgotClockOut++;
          } else {
            calcEnd = calcStart; // No hours for future?
          }

          hours = Math.max(0, (calcEnd.getTime() - calcStart.getTime()) / 3600000);
        } else if (clockIn && clockOut) {
          // Legacy calculation if no shift
          hours = (clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / (1000 * 60 * 60);
        } else if (isToday && clockIn) {
          status = 'IN PROGRESS';
          hours = (new Date().getTime() - clockIn.timestamp.getTime()) / (1000 * 60 * 60);
        } else if (clockIn || clockOut) {
          status = 'PRESENT';
          missingClockIn = !clockIn;
          missingClockOut = !clockOut;
          if (missingClockOut) daysForgotClockOut++;
        }
        
        totalHours += hours;
      } else if (isFuture || isToday) {
        // If it's today or the future and they haven't clocked out yet, don't mark as absent
        if (isWeekEnd) {
          status = 'WEEKEND';
        } else if (holiday) {
          status = `HOLIDAY (${holiday.name})`;
        } else if (breakItem) {
          status = `BREAK (${breakItem.name})`;
        } else if (!term) {
          status = 'OFF-TERM / VACATION';
        } else {
          status = isToday ? 'IN PROGRESS' : 'SCHEDULED';
        }
      } else if (isWeekEnd) {
        status = 'WEEKEND';
      } else if (holiday) {
        status = `HOLIDAY (${holiday.name})`;
      } else if (breakItem) {
        status = `BREAK (${breakItem.name})`;
      } else if (!term) {
        status = 'OFF-TERM / VACATION';
      } else if (day < registrationDate) {
        status = 'NOT REGISTERED YET';
      } else {
        status = 'ABSENT';
        daysAbsent++;
      }

      return {
        date: dayStr,
        status,
        clockIn: clockIn?.timestamp,
        clockOut: clockOut?.timestamp,
        hours: Number(hours.toFixed(2)),
        isLate,
        lateMinutes,
        isEarlyOut,
        earlyOutMinutes,
        missingClockIn,
        missingClockOut,
      };
    });

    return {
      employee: {
        fullName: employee.user.fullName,
        code: employee.employeeCode,
        shift: employee.shift ? `${employee.shift.startTime} - ${employee.shift.endTime}` : 'No Shift',
      },
      summary: {
        totalHours: Number(totalHours.toFixed(2)),
        daysWorked,
        daysAbsent,
        daysLate,
        totalLateMinutes,
        daysEarlyDeparture,
        totalEarlyOutMinutes,
        daysForgotClockOut,
      },
      days: reportDays,
    };
  }

  private _timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
