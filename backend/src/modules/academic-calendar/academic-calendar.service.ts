import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AcademicTerm } from './term.entity';
import { TermBreak } from './term-break.entity';

@Injectable()
export class AcademicCalendarService {
  constructor(
    @InjectRepository(AcademicTerm)
    private readonly termRepo: Repository<AcademicTerm>,
    @InjectRepository(TermBreak)
    private readonly breakRepo: Repository<TermBreak>,
  ) {}

  async findAllTerms(): Promise<AcademicTerm[]> {
    return this.termRepo.find({
      relations: ['breaks'],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Returns terms for the current academic year.
   * Detection priority:
   * 1. Find the term whose date range contains TODAY → use its academicYear.
   * 2. Fall back: find the most-recently-started active term before today.
   * 3. Last resort: compute academic year from calendar (Sep–Aug boundary).
   */
  async findCurrentYearTerms(): Promise<AcademicTerm[]> {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Priority 1: term that spans today's date
    const spanningTerm = await this.termRepo
      .createQueryBuilder('term')
      .where(':today BETWEEN term.startDate AND term.endDate', { today: todayStr })
      .orderBy('term.startDate', 'ASC')
      .getOne();

    let targetYear: string | null = spanningTerm?.academicYear ?? null;

    if (!targetYear) {
      // Priority 2: most-recently-started active term before or on today
      const recentTerm = await this.termRepo
        .createQueryBuilder('term')
        .where('term.startDate <= :today', { today: todayStr })
        .andWhere('term.isActive = true')
        .orderBy('term.startDate', 'DESC')
        .getOne();
      targetYear = recentTerm?.academicYear ?? null;
    }

    if (!targetYear) {
      // Priority 3: compute from calendar — academic year starts in September
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const startYear = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
      targetYear = `${startYear}/${startYear + 1}`;
    }

    return this.termRepo.find({
      where: { academicYear: targetYear },
      relations: ['breaks'],
      order: { startDate: 'ASC' },
    });
  }

  async findOneTerm(id: string): Promise<AcademicTerm> {
    const term = await this.termRepo.findOne({
      where: { id },
      relations: ['breaks'],
    });
    if (!term) throw new NotFoundException('Term not found');
    return term;
  }

  async createTerm(data: Partial<AcademicTerm>): Promise<AcademicTerm> {
    const term = this.termRepo.create(data);
    return this.termRepo.save(term);
  }

  async updateTerm(id: string, data: Partial<AcademicTerm>): Promise<AcademicTerm> {
    const term = await this.termRepo.findOne({ where: { id } });
    if (!term) throw new NotFoundException('Term not found');
    Object.assign(term, data);
    return this.termRepo.save(term);
  }

  async deleteTerm(id: string): Promise<void> {
    const result = await this.termRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Term not found');
  }

  async createBreak(termId: string, data: Partial<TermBreak>): Promise<TermBreak> {
    const term = await this.termRepo.findOne({ where: { id: termId } });
    if (!term) throw new NotFoundException('Term not found');
    const breakItem = this.breakRepo.create({ ...data, term });
    return this.breakRepo.save(breakItem);
  }

  async deleteBreak(id: string): Promise<void> {
    const result = await this.breakRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Break not found');
  }

  async getTermForDate(date: Date): Promise<AcademicTerm | null> {
    const dateStr = date.toISOString().split('T')[0];
    return this.termRepo.createQueryBuilder('term')
      .leftJoinAndSelect('term.breaks', 'breaks')
      .where(':dateStr BETWEEN term.startDate AND term.endDate', { dateStr })
      .getOne();
  }

  async isBreak(date: Date): Promise<string | null> {
    const dateStr = date.toISOString().split('T')[0];
    const breakItem = await this.breakRepo.createQueryBuilder('break')
      .where(':dateStr BETWEEN break.startDate AND break.endDate', { dateStr })
      .getOne();
    return breakItem ? breakItem.name : null;
  }
}
