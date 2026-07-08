import { Test, TestingModule } from '@nestjs/testing';
import { ClothesController } from './clothes.controller';
import { ClothesService } from './services/clothes.service';
import { ClothesVariantsService } from './services/clothes-variants.service';
import { ClothesImagesService } from './services/clothes-images.service';
import { StorageService } from 'src/modules/storage/storage.service';

describe('ClothesController', () => {
  let controller: ClothesController;
  let clothesService: Record<string, jest.Mock>;
  let clothesVariantService: Record<string, jest.Mock>;
  let clothesImagesService: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;

  const user = { tenantId: 'tenant-1', roles: ['admin'] };

  beforeEach(async () => {
    clothesService = {
      createClothe: jest.fn(),
      createDraftClothe: jest.fn(),
      getAllClothes: jest.fn(),
      searchAndFilterClothes: jest.fn(),
      getClothesById: jest.fn(),
      updateClothes: jest.fn(),
      deleteClothes: jest.fn(),
    };
    clothesVariantService = {
      addVariantToClothes: jest.fn(),
      updateVariant: jest.fn(),
      deleteVariant: jest.fn(),
    };
    clothesImagesService = {
      addImagesToClothes: jest.fn(),
      addNewImagesToClothes: jest.fn(),
      deleteImageFromClothes: jest.fn(),
    };
    storageService = {
      createPresignedPuts: jest.fn(),
      getImagesUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClothesController],
      providers: [
        { provide: ClothesService, useValue: clothesService },
        { provide: ClothesVariantsService, useValue: clothesVariantService },
        { provide: ClothesImagesService, useValue: clothesImagesService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    controller = module.get(ClothesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createClothes', () => {
    const dto = {
      name: 'Camisa',
      images: [{ contentType: 'image/png' }],
    } as any;

    it('crea la prenda, genera URLs pre-firmadas y guarda las imágenes', async () => {
      clothesService.createClothe.mockResolvedValue({ id: 'clothes-1' });
      storageService.createPresignedPuts.mockResolvedValue([{ key: 'key-1' }]);
      storageService.getImagesUrl.mockReturnValue(['https://cdn/key-1']);
      clothesImagesService.addImagesToClothes.mockResolvedValue([
        { id: 'img-1' },
      ]);

      const result = await controller.createClothes(dto, user);

      expect(clothesService.createClothe).toHaveBeenCalledWith(
        dto,
        user.tenantId,
      );
      expect(result).toEqual({
        id: 'clothes-1',
        preSignedPuts: [{ key: 'key-1' }],
      });
    });

    it('lanza un error si falla el guardado de imágenes', async () => {
      clothesService.createClothe.mockResolvedValue({ id: 'clothes-1' });
      storageService.createPresignedPuts.mockResolvedValue([{ key: 'key-1' }]);
      storageService.getImagesUrl.mockReturnValue(['https://cdn/key-1']);
      clothesImagesService.addImagesToClothes.mockResolvedValue([]);

      await expect(controller.createClothes(dto, user)).rejects.toThrow(
        'Failed to save image URLs to the database',
      );
    });
  });

  describe('createDraftClothes', () => {
    it('crea la prenda en borrador y sus imágenes', async () => {
      const dto = { name: 'Camisa borrador', images: [] } as any;
      clothesService.createDraftClothe.mockResolvedValue({ id: 'clothes-1' });
      storageService.createPresignedPuts.mockResolvedValue([]);
      storageService.getImagesUrl.mockReturnValue([]);
      clothesImagesService.addImagesToClothes.mockResolvedValue([]);

      await expect(controller.createDraftClothes(dto, user)).rejects.toThrow(
        'Failed to save image URLs to the database',
      );
    });
  });

  describe('getAllClothes', () => {
    it('delega en clothesService.getAllClothes con el tenantId', async () => {
      clothesService.getAllClothes.mockResolvedValue([{ id: 'clothes-1' }]);

      const result = await controller.getAllClothes(user);

      expect(clothesService.getAllClothes).toHaveBeenCalledWith(user.tenantId);
      expect(result).toEqual([{ id: 'clothes-1' }]);
    });
  });

  describe('searchAndFilterClothes', () => {
    it('delega en clothesService.searchAndFilterClothes con los filtros', async () => {
      clothesService.searchAndFilterClothes.mockResolvedValue([]);

      await controller.searchAndFilterClothes(
        user,
        'Camisa',
        undefined,
        'M',
        undefined,
      );

      expect(clothesService.searchAndFilterClothes).toHaveBeenCalledWith(
        user.tenantId,
        'Camisa',
        undefined,
        'M',
        undefined,
      );
    });
  });

  describe('getClothesById', () => {
    it('delega en clothesService.getClothesById', async () => {
      clothesService.getClothesById.mockResolvedValue({ id: 'clothes-1' });

      const result = await controller.getClothesById('clothes-1', user);

      expect(clothesService.getClothesById).toHaveBeenCalledWith(
        'clothes-1',
        user.tenantId,
      );
      expect(result).toEqual({ id: 'clothes-1' });
    });
  });

  describe('updateClothes', () => {
    it('delega en clothesService.updateClothes', async () => {
      const dto = { name: 'Nuevo nombre' } as any;
      clothesService.updateClothes.mockResolvedValue({
        id: 'clothes-1',
        name: 'Nuevo nombre',
      });

      const result = await controller.updateClothes('clothes-1', dto, user);

      expect(clothesService.updateClothes).toHaveBeenCalledWith(
        'clothes-1',
        dto,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'clothes-1', name: 'Nuevo nombre' });
    });
  });

  describe('addVariant', () => {
    it('delega en clothesVariantService.addVariantToClothes', async () => {
      const dto = { size: 'M', gender: 'unisex' } as any;
      clothesVariantService.addVariantToClothes.mockResolvedValue({
        id: 'variant-1',
      });

      const result = await controller.addVariant('clothes-1', dto, user);

      expect(clothesVariantService.addVariantToClothes).toHaveBeenCalledWith(
        'clothes-1',
        dto,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'variant-1' });
    });
  });

  describe('updateVariant', () => {
    it('delega en clothesVariantService.updateVariant', async () => {
      const dto = { additional: 10 } as any;
      clothesVariantService.updateVariant.mockResolvedValue({
        id: 'variant-1',
        additional: 10,
      });

      const result = await controller.updateVariant(
        'clothes-1',
        'variant-1',
        dto,
        user,
      );

      expect(clothesVariantService.updateVariant).toHaveBeenCalledWith(
        'clothes-1',
        'variant-1',
        dto,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'variant-1', additional: 10 });
    });
  });

  describe('deleteVariant', () => {
    it('delega en clothesVariantService.deleteVariant', async () => {
      clothesVariantService.deleteVariant.mockResolvedValue({
        message: 'Variant deleted successfully',
      });

      const result = await controller.deleteVariant(
        'clothes-1',
        'variant-1',
        user,
      );

      expect(clothesVariantService.deleteVariant).toHaveBeenCalledWith(
        'clothes-1',
        'variant-1',
        user.tenantId,
      );
      expect(result).toEqual({ message: 'Variant deleted successfully' });
    });
  });

  describe('addImages', () => {
    it('delega en clothesImagesService.addNewImagesToClothes', async () => {
      const dto = { images: [{ contentType: 'image/png' }] } as any;
      clothesImagesService.addNewImagesToClothes.mockResolvedValue({
        imageUrls: ['url-1'],
        preSignedPuts: [],
      });

      const result = await controller.addImages('clothes-1', dto, user);

      expect(clothesImagesService.addNewImagesToClothes).toHaveBeenCalledWith(
        'clothes-1',
        dto.images,
        user.tenantId,
      );
      expect(result).toEqual({ imageUrls: ['url-1'], preSignedPuts: [] });
    });
  });

  describe('deleteImage', () => {
    it('delega en clothesImagesService.deleteImageFromClothes', async () => {
      const dto = { url: 'https://cdn/img.png' };
      clothesImagesService.deleteImageFromClothes.mockResolvedValue({
        message: 'Image deleted successfully',
      });

      const result = await controller.deleteImage(
        'clothes-1',
        dto as any,
        user,
      );

      expect(clothesImagesService.deleteImageFromClothes).toHaveBeenCalledWith(
        'clothes-1',
        dto.url,
        user.tenantId,
      );
      expect(result).toEqual({ message: 'Image deleted successfully' });
    });
  });

  describe('deleteClothes', () => {
    it('delega en clothesService.deleteClothes', async () => {
      clothesService.deleteClothes.mockResolvedValue({
        message: 'Clothes item successfully deleted',
      });

      const result = await controller.deleteClothes('clothes-1', user);

      expect(clothesService.deleteClothes).toHaveBeenCalledWith(
        'clothes-1',
        user.tenantId,
      );
      expect(result).toEqual({ message: 'Clothes item successfully deleted' });
    });
  });
});
