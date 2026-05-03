import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
