import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../tenant/entities/tenant.entity';

@Entity('employee')
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256, nullable: false, unique: true })
  sub: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  names: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  lastNames: string;

  @Column({ type: 'varchar', length: 64, nullable: false, unique: true })
  email: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @ManyToOne(() => TenantEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
