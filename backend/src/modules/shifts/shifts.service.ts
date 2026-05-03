import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from './shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly repo: Repository<Shift>,
  ) {}

  findAll(): Promise<Shift[]> { 
    return this.repo.find(); 
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.repo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  create(data: CreateShiftDto): Promise<Shift> {
    const shift = this.repo.create(data);
    return this.repo.save(shift);
  }

  async update(id: string, data: UpdateShiftDto): Promise<Shift> {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
