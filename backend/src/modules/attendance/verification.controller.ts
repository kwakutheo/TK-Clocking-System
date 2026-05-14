import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportVerification } from './report-verification.entity';

@ApiTags('Verification')
@Controller('verify')
export class VerificationController {
  constructor(
    @InjectRepository(ReportVerification)
    private readonly verificationRepo: Repository<ReportVerification>,
  ) {}

  @Get(':code')
  @ApiOperation({ summary: 'Verify an official report by its code' })
  async verifyReport(@Param('code') code: string) {
    const verification = await this.verificationRepo.findOne({
      where: { verificationCode: code }
    });

    if (!verification) {
      throw new NotFoundException('Invalid or expired verification code');
    }

    return {
      success: true,
      data: verification.reportData,
      verifiedAt: verification.createdAt,
    };
  }
}
