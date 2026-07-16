import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, In, Repository } from 'typeorm';
import { ClothesEntity } from '../entities/clothes.entity';
import { CreateClothesDTO } from '../dto/create-clothes.dto';
import { ClothesVariantEntity } from '../entities/clothes-variant.entity';
import { SizeEntity } from '../entities/size.entity';
import { GenderEntity } from '../entities/gender.entity';
import { CreatedClothes } from '../interfaces/created-clothes.interface';
import { ClotheImageEntity } from '../entities/images.entity';
import { UpdateClothesDTO } from '../dto/update-clothes.dto';
import { QuoteDetailEntity } from 'src/modules/quote/entities/quote-detail.entity';
import { QuoteStatus } from 'src/modules/quote/enums/status.enum';
import { CreateDraftClothesDTO } from '../dto/create-draft-clothes.dto';
import { CLOTHES_GENDER } from '../enum/gender.enum';
import { CLOTHES_SIZES } from '../enum/size.enum';
import { ClothesFilterOptions } from '../interfaces/filter-options.interface';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class ClothesService {
  constructor(
    @InjectRepository(ClothesEntity)
    private readonly clothesRepository: Repository<ClothesEntity>,
    @InjectRepository(ClothesVariantEntity)
    private readonly variantsRepository: Repository<ClothesVariantEntity>,
    @InjectRepository(SizeEntity)
    private readonly sizeRepository: Repository<SizeEntity>,
    @InjectRepository(GenderEntity)
    private readonly genderRepository: Repository<GenderEntity>,
    @InjectRepository(ClotheImageEntity)
    private readonly imageRepository: Repository<ClotheImageEntity>,
    @InjectRepository(QuoteDetailEntity)
    private readonly quoteDetailRepository: Repository<QuoteDetailEntity>,
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ClothesService.name);
  }

  async createClothe(
    clothes: CreateClothesDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<CreatedClothes> {
    const { name, description, price, variants } = clothes;

    const variantKeys = new Set<string>();
    for (const v of variants) {
      const key = `${v.size}-${v.gender}`;
      if (variantKeys.has(key)) {
        throw new BadRequestException(
          `Duplicate combination of size and gender: ${v.size} - ${v.gender}`,
        );
      }
      variantKeys.add(key);
    }

    const uniqueSizes = [...new Set(variants.map((v) => v.size))];
    const uniqueGenders = [...new Set(variants.map((v) => v.gender))];

    const [sizes, genders] = await Promise.all([
      this.sizeRepository.find({ where: { size: In(uniqueSizes) } }),
      this.genderRepository.find({ where: { gender: In(uniqueGenders) } }),
    ]);

    const sizeIdByEnum = new Map(sizes.map((s) => [s.size, s.id]));
    const genderIdByEnum = new Map(genders.map((g) => [g.gender, g.id]));

    for (const v of variants) {
      if (!sizeIdByEnum.get(v.size))
        throw new BadRequestException(`Unknown size: ${v.size}`);
      if (!genderIdByEnum.get(v.gender))
        throw new BadRequestException(`Unknown gender: ${v.gender}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const newClothe = await queryRunner.manager.save(
        ClothesEntity,
        this.clothesRepository.create({ name, description, price, tenantId }),
      );
      const newVariants = variants.map((v) =>
        this.variantsRepository.create({
          clothesId: newClothe.id,
          sizeId: sizeIdByEnum.get(v.size)!,
          genderId: genderIdByEnum.get(v.gender)!,
          additional: v.additional,
          tenantId,
        }),
      );
      const savedVariants: ClothesVariantEntity[] =
        await queryRunner.manager.save(ClothesVariantEntity, newVariants);
      await queryRunner.commitTransaction();

      this.logger.info(
        {
          tenantId,
          clothesId: newClothe.id,
          variantCount: savedVariants.length,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Created clothes item',
      );

      return { ...newClothe, variants: savedVariants };
    } catch (error) {
      this.logger.error(
        { err: error, tenantId, name },
        'Error creating clothes item',
      );
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error creating the clothes item');
    } finally {
      await queryRunner.release();
    }
  }

  async createDraftClothe(
    clothes: CreateDraftClothesDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<CreatedClothes> {
    const { name, price } = clothes;
    const newClothe = this.clothesRepository.create({
      name,
      price,
      isDraft: true,
      isInEcommerce: false,
      tenantId,
    });

    const [gender, size] = await Promise.all([
      this.genderRepository.findOne({
        where: {
          gender: Equal(CLOTHES_GENDER.UNISEX),
        },
      }),
      this.sizeRepository.findOne({
        where: {
          size: Equal(CLOTHES_SIZES.M),
        },
      }),
    ]);

    try {
      const savedClothe = await this.clothesRepository.save(newClothe);
      const newVariant = this.variantsRepository.create({
        clothesId: savedClothe.id,
        additional: 0,
        genderId: gender.id,
        sizeId: size.id,
        tenantId,
      });
      const savedVariant = await this.variantsRepository.save(newVariant);

      this.logger.info(
        {
          tenantId,
          clothesId: savedClothe.id,
          variantCount: 1,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Created draft clothes item',
      );

      return { ...savedClothe, variants: [savedVariant] };
    } catch (error) {
      this.logger.error(
        { err: error, tenantId, name },
        'Error creating draft clothes item',
      );
      throw new BadRequestException('Error creating draft clothes item');
    }
  }

  async getAllClothes(
    tenantId: string,
    filterOptions?: ClothesFilterOptions,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<any> {
    try {
      const queryBuilder = this.clothesRepository
        .createQueryBuilder('clothes')
        .where('clothes.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('clothes.clothe_image', 'image')
        .select([
          'clothes.id',
          'clothes.name',
          'clothes.description',
          'clothes.price',
          'clothes.isDraft',
          'clothes.isInEcommerce',
          'image.url',
        ]);

      if (filterOptions?.isInEcommerce !== undefined) {
        queryBuilder.andWhere('clothes.isInEcommerce = :isInEcommerce', {
          isInEcommerce: filterOptions.isInEcommerce,
        });
      }

      if (filterOptions?.isDraft !== undefined) {
        queryBuilder.andWhere('clothes.isDraft = :isDraft', {
          isDraft: filterOptions.isDraft,
        });
      }
      const clothes = await queryBuilder.getMany();

      this.logger.info(
        {
          tenantId,
          count: clothes.length,
          hasFilters: Boolean(filterOptions),
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Listed clothes items',
      );
      return clothes;
    } catch (error) {
      this.logger.error(
        { err: error, tenantId, filterOptions },
        'Error fetching clothes items',
      );
      throw new BadRequestException('Error fetching clothes items');
    }
  }

  async getClothesById(
    clothesId: string,
    tenantId: string,
    filterOptions?: ClothesFilterOptions,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<any> {
    let clothe = null;
    try {
      const queryBuilder = this.clothesRepository
        .createQueryBuilder('clothes')
        .where('clothes.id = :clothesId', { clothesId })
        .andWhere('clothes.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('clothes.clothes_variant', 'variant')
        .leftJoinAndSelect('variant.size', 'size')
        .leftJoinAndSelect('variant.gender', 'gender')
        .leftJoinAndSelect('clothes.clothe_image', 'image')
        .select([
          'clothes.id',
          'clothes.name',
          'clothes.description',
          'clothes.price',
          'clothes.createdAt',
          'clothes.updatedAt',
          'clothes.isDraft',
          'clothes.isInEcommerce',

          'variant.additional',
          'variant.id',

          'size.size',

          'gender.gender',

          'image.url',
        ]);

      if (filterOptions?.isInEcommerce !== undefined) {
        queryBuilder.andWhere('clothes.isInEcommerce = :isInEcommerce', {
          isInEcommerce: filterOptions.isInEcommerce,
        });
      }

      if (filterOptions?.isDraft !== undefined) {
        queryBuilder.andWhere('clothes.isDraft = :isDraft', {
          isDraft: filterOptions.isDraft,
        });
      }

      clothe = await queryBuilder.getOne();
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId, filterOptions },
        'Error fetching the clothes item',
      );
      throw new BadRequestException('Error fetching the clothes item');
    }
    if (!clothe) {
      throw new NotFoundException('Clothes item not found');
    }
    this.logger.info(
      {
        tenantId,
        clothesId,
        hasFilters: Boolean(filterOptions),
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Retrieved clothes item',
    );
    return clothe;
  }

  async getClothesByIdsArray(clothesIds: string[]): Promise<ClothesEntity[]> {
    let clothes: ClothesEntity[];
    try {
      clothes = await this.clothesRepository.find({
        where: { id: In(clothesIds) },
      });
    } catch (error) {
      this.logger.error(
        { err: error, clothesIds },
        'Error retrieving clothes items',
      );
      throw new BadRequestException('Error retrieving clothes items');
    }
    return clothes;
  }

  async updateClothes(
    clothesId: string,
    updateData: UpdateClothesDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<ClothesEntity> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or you do not have permission access it',
      );
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      await this.clothesRepository.update(
        { id: clothesId, tenantId },
        updateData,
      );

      this.logger.info(
        {
          clothesId,
          tenantId,
          updatedFields: Object.keys(updateData),
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Updated clothes item',
      );

      return await this.clothesRepository.findOne({
        where: { id: clothesId, tenantId },
      });
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId },
        'Error updating clothes item',
      );
      throw new BadRequestException('Error updating clothes item');
    }
  }

  async searchAndFilterClothes(
    tenantId: string,
    name?: string,
    description?: string,
    size?: string,
    gender?: string,
    filterOptions?: ClothesFilterOptions,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<any[]> {
    try {
      let query = this.clothesRepository
        .createQueryBuilder('clothes')
        .where('clothes.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('clothes.clothes_variant', 'variant')
        .leftJoinAndSelect('variant.size', 'size')
        .leftJoinAndSelect('variant.gender', 'gender')
        .leftJoinAndSelect('clothes.clothe_image', 'image')
        .select([
          'clothes.id',
          'clothes.name',
          'clothes.description',
          'clothes.price',
          'clothes.isInEcommerce',
          'clothes.isDraft',
          'variant.id',
          'variant.additional',
          'size.size',
          'gender.gender',
          'image.url',
        ]);

      if (name && name.trim() !== '') {
        query = query.andWhere('clothes.name ILIKE :name', {
          name: `%${name.trim()}%`,
        });
      }

      if (description && description.trim() !== '') {
        query = query.andWhere('clothes.description ILIKE :description', {
          description: `%${description.trim()}%`,
        });
      }

      if (size && size.trim() !== '') {
        query = query.andWhere('CAST(size.size AS TEXT) ILIKE :size', {
          size: size.trim(),
        });
      }

      if (gender && gender.trim() !== '') {
        query = query.andWhere('CAST(gender.gender AS TEXT) ILIKE :gender', {
          gender: gender.trim(),
        });
      }

      if (filterOptions?.isInEcommerce !== undefined) {
        query = query.andWhere('clothes.isInEcommerce = :isInEcommerce', {
          isInEcommerce: filterOptions.isInEcommerce,
        });
      }

      if (filterOptions?.isDraft !== undefined) {
        query = query.andWhere('clothes.isDraft = :isDraft', {
          isDraft: filterOptions.isDraft,
        });
      }

      const clothes = await query.getMany();

      this.logger.info(
        {
          tenantId,
          count: clothes.length,
          hasNameFilter: Boolean(name && name.trim()),
          hasDescriptionFilter: Boolean(description && description.trim()),
          hasSizeFilter: Boolean(size && size.trim()),
          hasGenderFilter: Boolean(gender && gender.trim()),
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Searched and filtered clothes items',
      );

      return clothes;
    } catch (error) {
      this.logger.error(
        {
          err: error,
          tenantId,
          name,
          description,
          size,
          gender,
          filterOptions,
        },
        'Error searching and filtering clothes',
      );
      throw new BadRequestException('Error searching and filtering clothes');
    }
  }

  async checkIfClothesAreDraft(clothesIds: string[]): Promise<{
    hasDrafts: boolean;
    draftClothes: Array<{ id: string; name: string }>;
  }> {
    try {
      const clothes = await this.clothesRepository.find({
        where: { id: In(clothesIds), isDraft: true },
        select: ['id', 'name'],
      });

      return {
        hasDrafts: clothes.length > 0,
        draftClothes: clothes.map((c) => ({ id: c.id, name: c.name })),
      };
    } catch (error) {
      this.logger.error(
        { err: error, clothesIds },
        'Error checking draft clothes',
      );
      throw new BadRequestException('Error checking draft clothes');
    }
  }

  async deleteClothes(
    clothesId: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<{ message: string }> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or you do not have permission to access it',
      );
    }

    const activeReferences = await this.quoteDetailRepository.count({
      where: {
        clothesVariant: {
          clothesId: clothesId,
        },
        quote: {
          status: In([QuoteStatus.PENDING, QuoteStatus.APPROVED]),
        },
      },
      relations: ['clothesVariant', 'quote'],
    });

    if (activeReferences > 0) {
      throw new BadRequestException(
        'Cannot delete clothes item as it is currently referenced in active (PENDING or APPROVED) quotes and/or orders. Cancel those quotes/orders first.',
      );
    }

    try {
      await this.clothesRepository.softDelete({ id: clothesId, tenantId });
      this.logger.info(
        {
          clothesId,
          tenantId,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Deleted clothes item',
      );
      return { message: 'Clothes item successfully deleted' };
    } catch (error) {
      this.logger.error(
        { err: error, id: clothesId, tenantId },
        'Error deleting clothes item',
      );
      throw new BadRequestException('Error deleting clothes item');
    }
  }
}
