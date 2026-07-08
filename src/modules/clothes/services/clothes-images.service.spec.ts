import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClothesImagesService } from './clothes-images.service';
import { ClothesEntity } from '../entities/clothes.entity';
import { ClotheImageEntity } from '../entities/images.entity';
import { StorageService } from 'src/modules/storage/storage.service';

describe('ClothesImagesService', () => {
  let service: ClothesImagesService;
  let clothesRepository: { findOne: jest.Mock };
  let imageRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let storageService: Record<string, jest.Mock>;

  beforeEach(async () => {
    clothesRepository = { findOne: jest.fn() };
    imageRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    storageService = {
      createPresignedPuts: jest.fn(),
      getImagesUrl: jest.fn(),
      extractKeyFromUrl: jest.fn(),
      deleteObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothesImagesService,
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClothesEntity),
          useValue: clothesRepository,
        },
        {
          provide: getRepositoryToken(ClotheImageEntity),
          useValue: imageRepository,
        },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(ClothesImagesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('addNewImagesToClothes', () => {
    const clothesId = 'clothes-1';
    const tenantId = 'tenant-1';
    const images = [{ contentType: 'image/png' }] as any;

    it('lanza NotFoundException si la prenda no existe o no pertenece al tenant', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addNewImagesToClothes(clothesId, images, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea las URLs pre-firmadas y guarda las imágenes correctamente', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId, tenantId });
      storageService.createPresignedPuts.mockResolvedValue([{ key: 'key-1' }]);
      storageService.getImagesUrl.mockReturnValue(['https://cdn/key-1']);
      imageRepository.create.mockReturnValue({ url: 'https://cdn/key-1' });
      imageRepository.save.mockResolvedValue([
        { id: 'img-1', url: 'https://cdn/key-1' },
      ]);

      const result = await service.addNewImagesToClothes(
        clothesId,
        images,
        tenantId,
      );

      expect(storageService.createPresignedPuts).toHaveBeenCalledWith(
        clothesId,
        images,
        tenantId,
        { ttlSeconds: 3600, cacheControl: 'no-cache' },
      );
      expect(result).toEqual({
        imageUrls: ['https://cdn/key-1'],
        preSignedPuts: [{ key: 'key-1' }],
      });
    });

    it('lanza BadRequestException si algo falla durante el proceso', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: clothesId, tenantId });
      storageService.createPresignedPuts.mockRejectedValue(
        new Error('S3 down'),
      );

      await expect(
        service.addNewImagesToClothes(clothesId, images, tenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteImageFromClothes', () => {
    const clothesId = 'clothes-1';
    const tenantId = 'tenant-1';
    const imageUrl = 'https://cdn/key-1';

    it('lanza NotFoundException si la imagen no existe o no pertenece a la prenda/tenant', async () => {
      imageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteImageFromClothes(clothesId, imageUrl, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la URL de la imagen no tiene una key válida', async () => {
      imageRepository.findOne.mockResolvedValue({ id: 'img-1' });
      storageService.extractKeyFromUrl.mockReturnValue(null);

      await expect(
        service.deleteImageFromClothes(clothesId, imageUrl, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('elimina la imagen de S3 y de la base de datos exitosamente', async () => {
      imageRepository.findOne.mockResolvedValue({ id: 'img-1' });
      storageService.extractKeyFromUrl.mockReturnValue('key-1');
      storageService.deleteObject.mockResolvedValue(true);
      imageRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteImageFromClothes(
        clothesId,
        imageUrl,
        tenantId,
      );

      expect(imageRepository.delete).toHaveBeenCalledWith('img-1');
      expect(result).toEqual({ message: 'Image deleted successfully' });
    });
  });

  describe('addImagesToClothes', () => {
    it('lanza BadRequestException si no se guarda ninguna imagen', async () => {
      imageRepository.create.mockReturnValue({});
      imageRepository.save.mockResolvedValue([]);

      await expect(
        service.addImagesToClothes('clothes-1', ['url-1'], 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('guarda las imágenes exitosamente', async () => {
      imageRepository.create.mockImplementation((data) => data);
      imageRepository.save.mockResolvedValue([{ id: 'img-1', url: 'url-1' }]);

      const result = await service.addImagesToClothes(
        'clothes-1',
        ['url-1'],
        'tenant-1',
      );

      expect(result).toEqual([{ id: 'img-1', url: 'url-1' }]);
    });
  });
});
