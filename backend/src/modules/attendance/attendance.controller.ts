import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { AttendanceReportService } from './attendance-report.service';
import { EmployeesService } from '../employees/employees.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { QrClockDto } from './dto/qr-clock.dto';
import { AdminManualClockDto } from './dto/admin-manual-clock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

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

  @Get()
  @ApiOperation({ summary: 'List attendance records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'employee_id', required: false, type: String })
  list(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('employee_id') employeeId?: string,
  ) {
    return this.service.getHistory(user.id, user.role, page, limit, employeeId);
  }

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
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance.view')
  @ApiOperation({
    summary: 'Get detailed monthly attendance report for an employee',
  })
  getMonthlyReport(
    @Param('employeeId') employeeId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportService.getMonthlyReport(employeeId, month, year);
  }

  @Get('report/:employeeId/term/:termId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance.view')
  @ApiOperation({
    summary: 'Get detailed term attendance report for an employee',
  })
  getTermReport(
    @Param('employeeId') employeeId: string,
    @Param('termId') termId: string,
  ) {
    return this.reportService.getTermReport(employeeId, termId);
  }

  @Post('clock-in')
  @ApiOperation({ summary: 'Record a clock-in, clock-out, or break event' })
  record(@CurrentUser() user: User, @Body() dto: RecordAttendanceDto) {
    return this.service.record(user.id, dto);
  }

  @Post('qr-clock')
  @ApiOperation({
    summary: 'Record attendance via QR code scan (no GPS required)',
  })
  qrClock(@CurrentUser() user: User, @Body() dto: QrClockDto) {
    return this.service.recordViaQr(user.id, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Batch sync offline attendance records' })
  syncOffline(@CurrentUser() user: User, @Body() dto: SyncOfflineDto) {
    return this.service.syncOffline(user.id, dto);
  }

  @Post('admin-clock')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance.admin_clock')
  @ApiOperation({
    summary: 'Admin manually clocks in/out an employee (HR Admin and Super Admin only)',
  })
  adminManualClock(@CurrentUser() user: User, @Body() dto: AdminManualClockDto) {
    return this.service.adminManualClock(user.id, user.role, dto);
  }

  @Get('home-data')
  @ApiOperation({ summary: 'Get aggregated data for mobile home screen' })
  getHomeData(@CurrentUser() user: User) {
    return this.service.getHomeData(user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get attendance history (own for employees, all for admins)',
  })
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
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance.view_live')
  @ApiOperation({ summary: "Today's live clock-in feed (Supervisor+)" })
  @ApiQuery({ name: 'date', required: false, type: String })
  getLive(@Query('date') date?: string) {
    return this.service.getLive(date);
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance.view_live')
  @ApiOperation({ summary: "Today's dashboard attendance stats (Supervisor+)" })
  @ApiQuery({ name: 'date', required: false, type: String })
  getStats(@Query('date') date?: string) {
    return this.service.getDashboardStats(date);
  }
}
