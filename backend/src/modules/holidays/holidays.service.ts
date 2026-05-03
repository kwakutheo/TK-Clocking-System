import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './holiday.entity';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly repo: Repository<Holiday>,
  ) {}

  async findAll(): Promise<Holiday[]> {
    return this.repo.find({ order: { date: 'ASC' } });
  }

  async create(data: Partial<Holiday>): Promise<Holiday> {
    const holiday = this.repo.create(data);
    return this.repo.save(holiday);
  }

  async delete(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Holiday not found');
  }

  async getHolidayForDate(date: Date): Promise<Holiday | null> {
    const dateStr = date.toISOString().split('T')[0];
    const monthDay = dateStr.substring(5); // MM-DD

    const holidays = await this.repo.find();
    return holidays.find(h => {
      if (h.date === dateStr) return true;
      if (h.isRecurring && h.date.substring(5) === monthDay) return true;
      return false;
    }) || null;
  }
}
