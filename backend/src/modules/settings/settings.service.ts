import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  async findAll(): Promise<Setting[]> {
    return this.repo.find();
  }

  async findOne(key: string): Promise<string | null> {
    const s = await this.repo.findOne({ where: { key } });
    return s ? s.value : null;
  }

  async update(key: string, value: string): Promise<Setting> {
    let s = await this.repo.findOne({ where: { key } });
    if (s) {
      s.value = value;
    } else {
      s = this.repo.create({ key, value });
    }
    return this.repo.save(s);
  }

  async updateMany(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.update(key, value);
    }
  }

  private async ensureDefaultSettings() {
    const defaults = [
      { key: 'company_name', value: 'TK Clocking System', description: 'The name of your organization.' },
      { key: 'grace_period_minutes', value: '15', description: 'Allowed minutes late before marked as late.' },
      { key: 'clock_out_reminder_buffer', value: '10', description: 'Minutes after shift end before automatic reminder/forget detection.' },
      { key: 'geofence_enabled', value: 'true', description: 'Whether to enforce geofencing for clocking.' },
      { key: 'default_radius', value: '300', description: 'Default radius in meters for new branches.' },
    ];

    for (const d of defaults) {
      const exists = await this.repo.findOne({ where: { key: d.key } });
      if (!exists) {
        await this.repo.save(this.repo.create(d));
      }
    }
  }
}
