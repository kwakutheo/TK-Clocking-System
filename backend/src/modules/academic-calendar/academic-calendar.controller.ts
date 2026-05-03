import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AcademicCalendarService } from './academic-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AcademicTerm } from './term.entity';
import { TermBreak } from './term-break.entity';
import { CreateTermDto, UpdateTermDto } from './dto/term.dto';
import { CreateBreakDto } from './dto/break.dto';

@ApiTags('Academic Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('academic-calendar')
export class AcademicCalendarController {
  constructor(private readonly service: AcademicCalendarService) {}

  @Get('terms')
  @ApiOperation({ summary: 'List all academic terms' })
  findAllTerms() {
    return this.service.findAllTerms();
  }

  @Post('terms')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an academic term (HR Admin+)' })
  async createTerm(@Body() data: CreateTermDto) {
    return this.service.createTerm(data);
  }

  @Put('terms/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an academic term (HR Admin+)' })
  async updateTerm(@Param('id') id: string, @Body() data: UpdateTermDto) {
    return this.service.updateTerm(id, data);
  }

  @Delete('terms/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete an academic term (HR Admin+)' })
  deleteTerm(@Param('id') id: string) {
    return this.service.deleteTerm(id);
  }

  @Post('terms/:id/breaks')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a break for a term (HR Admin+)' })
  createBreak(@Param('id') termId: string, @Body() data: CreateBreakDto) {
    return this.service.createBreak(termId, data);
  }

  @Delete('breaks/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a break (HR Admin+)' })
  deleteBreak(@Param('id') id: string) {
    return this.service.deleteBreak(id);
  }
}
