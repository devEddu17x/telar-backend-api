import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClothesVariantsService } from './clothes-variants.service';
import { ClothesEntity } from '../entities/clothes.entity';
import { ClothesVariantEntity } from '../entities/clothes-variant.entity';
import { SizeEntity } from '../entities/size.entity';
import { GenderEntity } from '../entities/gender.entity';
import { QuoteDetailEntity } from 'src/modules/quote/entities/quote-detail.entity';

describe('ClothesVariantsService', () => {
  let service: ClothesVariantsService;
  let clothesRepository: { findOne: jest.Mock };
  let variantsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let sizeRepository: { findOne: jest.Mock };
  let genderRepository: { findOne: jest.Mock };
  let quoteDetailRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    clothesRepository = { findOne: jest.fn() };
    variantsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };
    sizeRepository = { findOne: jest.fn() };
    genderRepository = { findOne: jest.fn() };
    quoteDetailRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothesVariantsService,
        {
          provide: getRepositoryToken(ClothesEntity),
          useValue: clothesRepository,
        },
        {
          provide: getRepositoryToken(ClothesVariantEntity),
          useValue: variantsRepository,
        },
        { provide: getRepositoryToken(SizeEntity), useValue: sizeRepository },
        {
          provide: getRepositoryToken(GenderEntity),
          useValue: genderRepository,
        },
        {
          provide: getRepositoryToken(QuoteDetailEntity),
          useValue: quoteDetailRepository,
        },
      ],
    }).compile();

    service = module.get(ClothesVariantsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('addVariantToClothes', () => {
    const clothesId = 'clothes-1';
    const tenantId = 'tenant-1';
    const variantData = { size: 'M', gender: 'unisex', additional: 5 } as any;

    it('lanza NotFoundException si la prenda no existe', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addVariantToClothes(clothesId, variantData, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la talla no existe', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      sizeRepository.findOne.mockResolvedValue(null);
      genderRepository.findOne.mockResolvedValue({ id: 'gender-1' });

      await expect(
        service.addVariantToClothes(clothesId, variantData, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el género no existe', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      sizeRepository.findOne.mockResolvedValue({ id: 'size-1' });
      genderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addVariantToClothes(clothesId, variantData, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la variante ya existe', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      sizeRepository.findOne.mockResolvedValue({ id: 'size-1' });
      genderRepository.findOne.mockResolvedValue({ id: 'gender-1' });
      variantsRepository.findOne.mockResolvedValue({ id: 'variant-existente' });

      await expect(
        service.addVariantToClothes(clothesId, variantData, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea la variante exitosamente', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      sizeRepository.findOne.mockResolvedValue({ id: 'size-1' });
      genderRepository.findOne.mockResolvedValue({ id: 'gender-1' });
      variantsRepository.findOne.mockResolvedValue(null);
      variantsRepository.create.mockReturnValue({
        clothesId,
        sizeId: 'size-1',
      });
      variantsRepository.save.mockResolvedValue({ id: 'variant-1' });

      const result = await service.addVariantToClothes(
        clothesId,
        variantData,
        tenantId,
      );

      expect(result).toEqual({ id: 'variant-1' });
    });
  });

  describe('updateVariant', () => {
    const clothesId = 'clothes-1';
    const variantId = 'variant-1';
    const tenantId = 'tenant-1';
    const updateData = { additional: 10 } as any;

    it('lanza NotFoundException si la prenda no existe', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateVariant(clothesId, variantId, updateData, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la variante no existe', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      variantsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateVariant(clothesId, variantId, updateData, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza la variante exitosamente', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      variantsRepository.findOne
        .mockResolvedValueOnce({ id: variantId }) // primer findOne (validación)
        .mockResolvedValueOnce({ id: variantId, additional: 10 }); // segundo findOne (retorno)
      variantsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateVariant(
        clothesId,
        variantId,
        updateData,
        tenantId,
      );

      expect(variantsRepository.update).toHaveBeenCalledWith(
        { id: variantId, tenantId },
        { additional: 10 },
      );
      expect(result).toEqual({ id: variantId, additional: 10 });
    });
  });

  describe('deleteVariant', () => {
    const clothesId = 'clothes-1';
    const variantId = 'variant-1';
    const tenantId = 'tenant-1';

    it('lanza NotFoundException si la prenda no existe', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteVariant(clothesId, variantId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la variante no existe', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      variantsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteVariant(clothesId, variantId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la variante está asociada a una cotización', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      variantsRepository.findOne.mockResolvedValue({ id: variantId });
      quoteDetailRepository.findOne.mockResolvedValue({ id: 'detail-1' });

      await expect(
        service.deleteVariant(clothesId, variantId, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('elimina la variante exitosamente', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId });
      variantsRepository.findOne.mockResolvedValue({ id: variantId });
      quoteDetailRepository.findOne.mockResolvedValue(null);
      variantsRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteVariant(
        clothesId,
        variantId,
        tenantId,
      );

      expect(result).toEqual({ message: 'Variant deleted successfully' });
    });
  });

  describe('getClothesVariantsByIdsArray', () => {
    it('lanza NotFoundException si no encuentra variantes', async () => {
      variantsRepository.find.mockResolvedValue([]);

      await expect(
        service.getClothesVariantsByIdsArray(['id-1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve las variantes encontradas', async () => {
      variantsRepository.find.mockResolvedValue([{ id: 'id-1' }]);

      const result = await service.getClothesVariantsByIdsArray(['id-1']);

      expect(result).toEqual([{ id: 'id-1' }]);
    });

    it('lanza BadRequestException si falla la consulta', async () => {
      variantsRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(
        service.getClothesVariantsByIdsArray(['id-1']),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
