import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { User } from '../users/user.entity';
import { LeaveStatus } from '../../common/enums';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  // ── Employee Routes ───────────────────────────────────────────────────────

  @Post('request')
  @ApiOperation({ summary: 'Submit a new leave request (employee)' })
  requestLeave(
    @CurrentUser() user: User,
    @Body() body: { leaveType: string; startDate: string; endDate: string; reason?: string },
  ) {
    return this.service.requestLeave(user.id, body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my own leave requests' })
  myLeaves(@CurrentUser() user: User) {
    return this.service.findMyLeaves(user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending leave request (employee)' })
  cancelLeave(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.cancelLeave(id, user.id);
  }

  // ── Admin Routes ──────────────────────────────────────────────────────────

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves.manage')
  @ApiOperation({ summary: 'List all leave requests (admin/HR)' })
  findAll(@Query('status') status?: LeaveStatus) {
    return this.service.findAll(status);
  }

  @Get('employee/:employeeId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves.manage')
  @ApiOperation({ summary: 'List leave requests for a specific employee (admin/HR)' })
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Patch(':id/review')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves.manage')
  @ApiOperation({ summary: 'Approve or reject a leave request (admin/HR)' })
  reviewLeave(
    @Param('id') id: string,
    @CurrentUser() reviewer: User,
    @Body() body: { status: LeaveStatus.APPROVED | LeaveStatus.REJECTED; reviewNote?: string },
  ) {
    return this.service.reviewLeave(id, reviewer, body);
  }
}
