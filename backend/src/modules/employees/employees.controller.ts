import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all employees (Supervisor+)' })
  findAll(): Promise<Employee[]> { return this.service.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Get current employee profile' })
  async getMe(@CurrentUser() user: { id: string }): Promise<Employee> {
    const emp = await this.service.findByUserId(user.id);
    if (!emp) throw new Error('Employee profile not found.');
    return emp;
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get employee by ID (Supervisor+)' })
  findOne(@Param('id') id: string): Promise<Employee> {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register new employee (HR Admin+)' })
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update employee (HR Admin+)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Request() req: any,
  ): Promise<Employee> {
    return this.service.update(id, dto, req.user);
  }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Request employee password reset (HR Admin+)' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() adminUser: User,
  ): Promise<{ pin: string }> {
    return this.service.resetPassword(id, dto.adminPassword, adminUser);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete employee (Super Admin)' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
