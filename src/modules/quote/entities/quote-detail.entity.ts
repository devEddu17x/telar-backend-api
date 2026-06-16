import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuoteEntity } from './quote.entity';
import { ClothesVariantEntity } from 'src/modules/clothes/entities/clothes-variant.entity';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';

@Entity('quote_detail')
@Index(['tenantId'])
export class QuoteDetailEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unitPrice: number;

  @Column({ type: 'int', nullable: false, default: 1 })
  quantity: number;

  @Column({ type: 'jsonb', nullable: true })
  customizations: Array<{
    name?: string;
    number?: number;
    notes?: string;
  }>;

  @Column('uuid', { name: 'quote_id' })
  quoteId: string;

  @ManyToOne(() => QuoteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id', referencedColumnName: 'id' })
  quote: QuoteEntity;

  @Column('uuid', { name: 'clothes_variant_id' })
  clothesVariantId: string;

  @ManyToOne(() => ClothesVariantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clothes_variant_id', referencedColumnName: 'id' })
  clothesVariant: ClothesVariantEntity;
}
