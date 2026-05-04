import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceLog } from './attendance-log.entity';
import { Employee } from '../employees/employee.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceReportService } from './attendance-report.service';
import { AttendanceController } from './attendance.controller';
import { EmployeesModule } from '../employees/employees.module';
import { BranchesModule } from '../branches/branches.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { AcademicCalendarModule } from '../academic-calendar/academic-calendar.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceLog, Employee]),
    EmployeesModule,
    BranchesModule,
    HolidaysModule,
    AcademicCalendarModule,
    SettingsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceReportService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
