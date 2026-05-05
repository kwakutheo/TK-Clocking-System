import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { Employee } from './employee.entity';
import { User } from '../users/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'List all employees' })
  findAll(): Promise<Employee[]> { return this.service.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Get current employee profile' })
  async getMe(@CurrentUser() user: { id: string }): Promise<Employee> {
    const emp = await this.service.findByUserId(user.id);
    if (!emp) throw new Error('Employee profile not found.');
    return emp;
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string): Promise<Employee> {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Register new employee' })
  register(@Body() dto: CreateEmployeeDto): Promise<Employee> {
    return this.service.createEmployeeWithUser(dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (self-service)' })
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ): Promise<Employee> {
    return this.service.updateProfile(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.edit')
  @ApiOperation({ summary: 'Update employee details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Request() req: any,
  ): Promise<Employee> {
    return this.service.update(id, dto, req.user);
  }

  @Post(':id/reset-password')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.reset_password')
  @ApiOperation({ summary: 'Request employee password reset' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() adminUser: User,
  ): Promise<{ pin: string }> {
    return this.service.resetPassword(id, dto.adminPassword, adminUser);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees.delete')
  @ApiOperation({ summary: 'Delete employee' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
