import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AcademicCalendarService } from './academic-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
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
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.view')
  @ApiOperation({ summary: 'List all academic terms' })
  findAllTerms() {
    return this.service.findAllTerms();
  }

  @Post('terms')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.create')
  @ApiOperation({ summary: 'Create an academic term' })
  async createTerm(@Body() data: CreateTermDto) {
    return this.service.createTerm(data);
  }

  @Put('terms/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.edit')
  @ApiOperation({ summary: 'Update an academic term' })
  async updateTerm(@Param('id') id: string, @Body() data: UpdateTermDto) {
    return this.service.updateTerm(id, data);
  }

  @Delete('terms/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.delete')
  @ApiOperation({ summary: 'Delete an academic term' })
  deleteTerm(@Param('id') id: string) {
    return this.service.deleteTerm(id);
  }

  @Post('terms/:id/breaks')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.edit')
  @ApiOperation({ summary: 'Create a break for a term' })
  createBreak(@Param('id') termId: string, @Body() data: CreateBreakDto) {
    return this.service.createBreak(termId, data);
  }

  @Delete('breaks/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('calendar.delete')
  @ApiOperation({ summary: 'Delete a break' })
  deleteBreak(@Param('id') id: string) {
    return this.service.deleteBreak(id);
  }
}
