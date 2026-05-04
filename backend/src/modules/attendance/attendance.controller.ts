import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe, DefaultValuePipe, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { AttendanceReportService } from './attendance-report.service';
import { EmployeesService } from '../employees/employees.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { QrClockDto } from './dto/qr-clock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { UserRole } from '../../common/enums';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly service: AttendanceService,
    private readonly reportService: AttendanceReportService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Get('my-report')
  @ApiOperation({ summary: 'Get own detailed monthly attendance report' })
  async getMyMonthlyReport(
    @CurrentUser() user: User,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) throw new NotFoundException('Employee not found');
    return this.reportService.getMonthlyReport(employee.id, month, year);
  }

  @Get('my-report/term/:termId')
  @ApiOperation({ summary: 'Get own detailed term attendance report' })
  async getMyTermReport(
    @CurrentUser() user: User,
    @Param('termId') termId: string,
  ) {
    const employee = await this.employeesService.findByUserId(user.id);
    if (!employee) throw new NotFoundException('Employee not found');
    return this.reportService.getTermReport(employee.id, termId);
  }

  @Get('report/:employeeId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get detailed monthly attendance report for an employee' })
  getMonthlyReport(
    @Param('employeeId') employeeId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportService.getMonthlyReport(employeeId, month, year);
  }

  @Get('report/:employeeId/term/:termId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get detailed term attendance report for an employee' })
  getTermReport(
    @Param('employeeId') employeeId: string,
    @Param('termId') termId: string,
  ) {
    return this.reportService.getTermReport(employeeId, termId);
  }

  @Post('clock-in')
  @ApiOperation({ summary: 'Record a clock-in, clock-out, or break event' })
  record(
    @CurrentUser() user: User,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.service.record(user.id, dto);
  }

  @Post('qr-clock')
  @ApiOperation({ summary: 'Record attendance via QR code scan (no GPS required)' })
  qrClock(
    @CurrentUser() user: User,
    @Body() dto: QrClockDto,
  ) {
    return this.service.recordViaQr(user.id, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Batch sync offline attendance records' })
  syncOffline(
    @CurrentUser() user: User,
    @Body() dto: SyncOfflineDto,
  ) {
    return this.service.syncOffline(user.id, dto);
  }

  @Get('home-data')
  @ApiOperation({ summary: 'Get aggregated data for mobile home screen' })
  getHomeData(@CurrentUser() user: User) {
    return this.service.getHomeData(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get attendance history (own for employees, all for admins)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getHistory(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('employee_id') employeeId?: string,
  ) {
    return this.service.getHistory(user.id, user.role, page, limit, employeeId);
  }

  @Get('live')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Today's live clock-in feed (Supervisor+)" })
  getLive() {
    return this.service.getLive();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Today's dashboard attendance stats (Supervisor+)" })
  getStats() {
    return this.service.getDashboardStats();
  }
}
