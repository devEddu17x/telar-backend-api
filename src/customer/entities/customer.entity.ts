import { QuoteEntity } from 'src/quote/entities/quote.entity';
import { TenantEntity } from '../../tenant/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customer')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 100, nullable: false })
  names: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  lastNames: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: false })
  isEcommerceUser: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => QuoteEntity, (quote) => quote.customer)
  quotes: QuoteEntity[];
}
