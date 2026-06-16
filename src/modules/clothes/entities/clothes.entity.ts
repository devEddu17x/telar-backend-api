import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClothesVariantEntity } from './clothes-variant.entity';
import { ClotheImageEntity } from './images.entity';
import { TenantEntity } from '../../tenant/entities/tenant.entity';

@Entity('clothes')
export class ClothesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 120, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ type: 'boolean', default: false })
  isInEcommerce: boolean;

  @Column({ type: 'boolean', default: false })
  isDraft: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ select: false }) // hidden from standard select
  deletedAt: Date;

  @OneToMany(() => ClothesVariantEntity, (variant) => variant.clothes)
  clothes_variant: ClothesVariantEntity[];

  @OneToMany(() => ClotheImageEntity, (image) => image.clothes)
  clothe_image: ClotheImageEntity[];
}
