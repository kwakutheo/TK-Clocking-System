import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ name: 'allowed_radius', default: 300 })
  allowedRadius: number;

  @Column({ name: 'qr_code', nullable: true })
  qrCode: string;

  @Column({ name: 'qr_code_updated_at', nullable: true })
  qrCodeUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
