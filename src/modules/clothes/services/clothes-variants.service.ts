import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateVariantDTO } from '../dto/update-variant.dto';
import { Variant } from '../dto/variants.dto';
import { ClothesVariantEntity } from '../entities/clothes-variant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, Repository } from 'typeorm';
import { ClothesEntity } from '../entities/clothes.entity';
import { SizeEntity } from '../entities/size.entity';
import { QuoteDetailEntity } from 'src/modules/quote/entities/quote-detail.entity';
import { GenderEntity } from '../entities/gender.entity';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class ClothesVariantsService {
  constructor(
    @InjectRepository(ClothesEntity)
    private readonly clothesRepository: Repository<ClothesEntity>,
    @InjectRepository(ClothesVariantEntity)
    private readonly variantsRepository: Repository<ClothesVariantEntity>,
    @InjectRepository(SizeEntity)
    private readonly sizeRepository: Repository<SizeEntity>,
    @InjectRepository(GenderEntity)
    private readonly genderRepository: Repository<GenderEntity>,
    @InjectRepository(QuoteDetailEntity)
    private readonly quoteDetailRepository: Repository<QuoteDetailEntity>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ClothesVariantsService.name);
  }
  async addVariantToClothes(
    clothesId: string,
    variantData: Variant,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<ClothesVariantEntity> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or does not belong to this tenant',
      );
    }

    const [size, gender] = await Promise.all([
      this.sizeRepository.findOne({ where: { size: variantData.size } }),
      this.genderRepository.findOne({
        where: { gender: variantData.gender },
      }),
    ]);

    if (!size) {
      throw new BadRequestException(`Unknown size: ${variantData.size}`);
    }

    if (!gender) {
      throw new BadRequestException(`Unknown gender: ${variantData.gender}`);
    }

    const existingVariant = await this.variantsRepository.findOne({
      where: {
        clothesId: clothesId,
        sizeId: size.id,
        genderId: gender.id,
        tenantId,
      },
    });

    if (existingVariant) {
      throw new BadRequestException(
        `Variant with size ${variantData.size} and gender ${variantData.gender} already exists for this clothes item`,
      );
    }

    try {
      const newVariant = this.variantsRepository.create({
        clothesId: clothesId,
        sizeId: size.id,
        genderId: gender.id,
        additional: variantData.additional,
        tenantId,
      });

      const savedVariant = await this.variantsRepository.save(newVariant);

      this.logger.info(
        {
          clothesId,
          tenantId,
          size: variantData.size,
          gender: variantData.gender,
          variantId: savedVariant.id,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Created clothes variant',
      );

      return savedVariant;
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId, variantData },
        'Error adding variant to clothes item',
      );
      throw new BadRequestException('Error adding variant to clothes item');
    }
  }

  async updateVariant(
    clothesId: string,
    variantId: string,
    updateData: UpdateVariantDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<ClothesVariantEntity> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or does not belong to this tenant',
      );
    }

    const variant = await this.variantsRepository.findOne({
      where: {
        id: variantId,
        clothesId: clothesId,
        tenantId,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'Variant not found or does not belong to this clothes item',
      );
    }

    try {
      await this.variantsRepository.update(
        { id: variantId, tenantId },
        {
          additional: updateData.additional,
        },
      );

      this.logger.info(
        {
          clothesId,
          tenantId,
          variantId,
          additional: updateData.additional,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Updated clothes variant',
      );

      return await this.variantsRepository.findOne({
        where: { id: variantId, tenantId },
      });
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId, variantId },
        'Error updating variant',
      );
      throw new BadRequestException('Error updating variant');
    }
  }

  async deleteVariant(
    clothesId: string,
    variantId: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<{ message: string }> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or does not belong to this tenant',
      );
    }

    const variant = await this.variantsRepository.findOne({
      where: {
        id: variantId,
        clothesId: clothesId,
        tenantId,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'Variant not found or does not belong to this clothes item',
      );
    }

    const quoteDetail = await this.quoteDetailRepository.findOne({
      where: { clothesVariantId: variantId },
    });

    if (quoteDetail) {
      throw new BadRequestException(
        'Cannot delete variant because it is associated with one or more quotes. You can only update the additional price.',
      );
    }

    try {
      await this.variantsRepository.delete({ id: variantId, tenantId });
      this.logger.info(
        {
          clothesId,
          tenantId,
          variantId,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Deleted clothes variant',
      );
      return {
        message: 'Variant deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId, variantId },
        'Error deleting variant',
      );
      throw new BadRequestException('Error deleting variant');
    }
  }
  async getClothesVariantsByIdsArray(
    clothesIds: string[],
  ): Promise<ClothesVariantEntity[]> {
    let clothes: ClothesVariantEntity[];
    try {
      clothes = await this.variantsRepository.find({
        where: { id: In(clothesIds) },
      });
    } catch (error) {
      this.logger.error(
        { err: error, clothesIds },
        'Error retrieving clothes variants',
      );
      throw new BadRequestException('Error retrieving clothes variants');
    }
    if (!clothes || clothes.length === 0) {
      throw new NotFoundException('No clothes variants found');
    }
    return clothes;
  }
}
