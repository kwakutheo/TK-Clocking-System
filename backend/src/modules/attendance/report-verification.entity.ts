import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('report_verifications')
@Index(['verificationCode'])
export class ReportVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'verification_code',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  verificationCode: string;

  @Column({
    name: 'report_data',
    type: 'jsonb',
  })
  reportData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
