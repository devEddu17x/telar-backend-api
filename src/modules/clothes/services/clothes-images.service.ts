import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AllowedImagesDTO } from '../dto/images.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageService } from 'src/modules/storage/storage.service';
import { Repository } from 'typeorm';
import { ClotheImageEntity } from '../entities/images.entity';
import { ClothesEntity } from '../entities/clothes.entity';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class ClothesImagesService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(ClothesEntity)
    private readonly clothesRepository: Repository<ClothesEntity>,
    @InjectRepository(ClotheImageEntity)
    private readonly imageRepository: Repository<ClotheImageEntity>,
    private readonly storageService: StorageService,
  ) {
    this.logger.setContext(ClothesImagesService.name);
  }
  async addNewImagesToClothes(
    clothesId: string,
    images: AllowedImagesDTO[],
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<{ imageUrls: string[]; preSignedPuts: any[] }> {
    const clothe = await this.clothesRepository.findOne({
      where: { id: clothesId, tenantId },
    });

    if (!clothe) {
      throw new NotFoundException(
        'Clothes item not found or you do not have permission access it',
      );
    }

    try {
      const preSignedPuts = await this.storageService.createPresignedPuts(
        clothesId,
        images,
        tenantId,
        actor,
        {
          ttlSeconds: 3600,
          cacheControl: 'no-cache',
        },
      );

      const keys = preSignedPuts.map((put) => put.key);
      const imageUrls = this.storageService.getImagesUrl(keys);

      const savedImages = await this.addImagesToClothes(
        clothesId,
        imageUrls,
        tenantId,
      );

      if (!savedImages || savedImages.length === 0) {
        throw new BadRequestException('Error saving images');
      }

      this.logger.info(
        {
          clothesId,
          tenantId,
          imageCount: savedImages.length,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Added images to clothes item',
      );

      return {
        imageUrls,
        preSignedPuts,
      };
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId },
        'Error adding images to clothes item',
      );
      throw new BadRequestException('Error adding images to clothes item');
    }
  }

  async deleteImageFromClothes(
    clothesId: string,
    imageUrl: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<{ message: string }> {
    const image = await this.imageRepository.findOne({
      where: {
        url: imageUrl,
        clothesId: clothesId,
        tenantId,
      },
    });

    if (!image) {
      throw new NotFoundException(
        'Image not found or does not belong to this clothes item',
      );
    }

    try {
      const key = this.storageService.extractKeyFromUrl(imageUrl);

      if (!key) {
        throw new BadRequestException('Invalid image URL');
      }

      const deleted = await this.storageService.deleteObject(key);

      if (!deleted) {
        this.logger.error(
          { key, clothesId, tenantId },
          'Failed to delete image from S3',
        );
      }

      await this.imageRepository.delete(image.id);

      this.logger.info(
        {
          clothesId,
          tenantId,
          imageUrl,
          key,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Deleted image from clothes item',
      );

      return {
        message: 'Image deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        { err: error, clothesId, tenantId, imageUrl },
        'Error deleting image',
      );
      throw new BadRequestException('Error deleting image');
    }
  }

  async addImagesToClothes(
    clothesId: string,
    imageUrls: string[],
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<ClotheImageEntity[]> {
    const newImages = imageUrls.map((url) =>
      this.imageRepository.create({ url, clothesId, tenantId }),
    );
    const savedImages = await this.imageRepository.save(newImages);
    if (!savedImages || savedImages.length === 0) {
      throw new BadRequestException('Error saving images');
    }
    this.logger.info(
      {
        clothesId,
        tenantId,
        imageCount: savedImages.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Added images to clothes item',
    );
    return savedImages;
  }
}
