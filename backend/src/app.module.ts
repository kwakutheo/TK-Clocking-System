import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AuditModule } from './modules/audit/audit.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { AcademicCalendarModule } from './modules/academic-calendar/academic-calendar.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    // ── Database ──────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'postgres'),
        database: config.get<string>('DB_NAME', 'tk_clocking'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ── Feature modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    EmployeesModule,
    AttendanceModule,
    BranchesModule,
    DepartmentsModule,
    ShiftsModule,
    AuditModule,
    HolidaysModule,
    AcademicCalendarModule,
    SettingsModule,
    LeavesModule,
    NotificationsModule,
  ],
  providers: [],
})
export class AppModule {}
