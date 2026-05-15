import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm';
import { Employee } from './employee.entity';
import { EmployeeStatus } from '../../common/enums';

@Entity('employee_status_logs')
export class EmployeeStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, employee => employee.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({
    type: 'varchar',
    length: 20,
  })
  status: EmployeeStatus;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
