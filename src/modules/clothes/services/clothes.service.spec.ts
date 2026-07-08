import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClothesService } from './clothes.service';
import { ClothesEntity } from '../entities/clothes.entity';
import { ClothesVariantEntity } from '../entities/clothes-variant.entity';
import { SizeEntity } from '../entities/size.entity';
import { GenderEntity } from '../entities/gender.entity';
import { ClotheImageEntity } from '../entities/images.entity';
import { QuoteDetailEntity } from 'src/modules/quote/entities/quote-detail.entity';

describe('ClothesService', () => {
  let service: ClothesService;
  let clothesRepository: any;
  let variantsRepository: any;
  let sizeRepository: any;
  let genderRepository: any;
  let quoteDetailRepository: any;
  let dataSource: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { save: jest.fn() },
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    clothesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    variantsRepository = { create: jest.fn(), save: jest.fn() };
    sizeRepository = { find: jest.fn(), findOne: jest.fn() };
    genderRepository = { find: jest.fn(), findOne: jest.fn() };
    quoteDetailRepository = { count: jest.fn() };
    dataSource = { createQueryRunner: jest.fn(() => mockQueryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothesService,
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
        { provide: getRepositoryToken(ClotheImageEntity), useValue: {} },
        {
          provide: getRepositoryToken(QuoteDetailEntity),
          useValue: quoteDetailRepository,
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ClothesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createClothe', () => {
    const dto = {
      name: 'Camisa',
      description: 'Camisa de algodón',
      price: 50,
      variants: [{ size: 'M', gender: 'unisex', additional: 0 }],
    } as any;

    it('lanza BadRequestException si hay combinaciones duplicadas de talla/género', async () => {
      const dtoConDuplicados = {
        ...dto,
        variants: [
          { size: 'M', gender: 'unisex', additional: 0 },
          { size: 'M', gender: 'unisex', additional: 5 },
        ],
      };

      await expect(
        service.createClothe(dtoConDuplicados, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si una talla no existe', async () => {
      sizeRepository.find.mockResolvedValue([]);
      genderRepository.find.mockResolvedValue([{ gender: 'unisex', id: 'g1' }]);

      await expect(service.createClothe(dto, 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('crea la prenda con sus variantes dentro de una transacción', async () => {
      sizeRepository.find.mockResolvedValue([{ size: 'M', id: 'size-1' }]);
      genderRepository.find.mockResolvedValue([
        { gender: 'unisex', id: 'gender-1' },
      ]);
      clothesRepository.create.mockReturnValue({ name: dto.name });
      variantsRepository.create.mockReturnValue({ sizeId: 'size-1' });
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'clothes-1', name: dto.name })
        .mockResolvedValueOnce([{ id: 'variant-1' }]);

      const result = await service.createClothe(dto, 'tenant-1');

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'clothes-1',
        name: dto.name,
        variants: [{ id: 'variant-1' }],
      });
    });

    it('hace rollback si falla el guardado en la transacción', async () => {
      sizeRepository.find.mockResolvedValue([{ size: 'M', id: 'size-1' }]);
      genderRepository.find.mockResolvedValue([
        { gender: 'unisex', id: 'gender-1' },
      ]);
      clothesRepository.create.mockReturnValue({ name: dto.name });
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createClothe(dto, 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getAllClothes', () => {
    it('devuelve las prendas del tenant', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 'clothes-1' }]);

      const result = await service.getAllClothes('tenant-1');

      expect(result).toEqual([{ id: 'clothes-1' }]);
    });

    it('lanza BadRequestException si falla la consulta', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getAllClothes('tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getClothesById', () => {
    it('lanza NotFoundException si la prenda no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.getClothesById('clothes-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve la prenda encontrada', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'clothes-1' });

      const result = await service.getClothesById('clothes-1', 'tenant-1');

      expect(result).toEqual({ id: 'clothes-1' });
    });
  });

  describe('updateClothes', () => {
    it('lanza NotFoundException si la prenda no existe', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateClothes(
          'clothes-1',
          { name: 'Nuevo' } as any,
          'tenant-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si no hay campos para actualizar', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: 'clothes-1' });

      await expect(
        service.updateClothes('clothes-1', {} as any, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza la prenda exitosamente', async () => {
      clothesRepository.findOne
        .mockResolvedValueOnce({ id: 'clothes-1' })
        .mockResolvedValueOnce({ id: 'clothes-1', name: 'Nuevo' });
      clothesRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateClothes(
        'clothes-1',
        { name: 'Nuevo' } as any,
        'tenant-1',
      );

      expect(result).toEqual({ id: 'clothes-1', name: 'Nuevo' });
    });
  });

  describe('checkIfClothesAreDraft', () => {
    it('indica que no hay borradores si ninguna prenda coincide', async () => {
      clothesRepository.find.mockResolvedValue([]);

      const result = await service.checkIfClothesAreDraft(['clothes-1']);

      expect(result).toEqual({ hasDrafts: false, draftClothes: [] });
    });

    it('indica los borradores encontrados', async () => {
      clothesRepository.find.mockResolvedValue([
        { id: 'clothes-1', name: 'Camisa X' },
      ]);

      const result = await service.checkIfClothesAreDraft(['clothes-1']);

      expect(result).toEqual({
        hasDrafts: true,
        draftClothes: [{ id: 'clothes-1', name: 'Camisa X' }],
      });
    });
  });

  describe('deleteClothes', () => {
    it('lanza NotFoundException si la prenda no existe', async () => {
      clothesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteClothes('clothes-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si tiene cotizaciones/órdenes activas', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: 'clothes-1' });
      quoteDetailRepository.count.mockResolvedValue(1);

      await expect(
        service.deleteClothes('clothes-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('elimina la prenda exitosamente (soft delete)', async () => {
      clothesRepository.findOne.mockResolvedValue({ id: 'clothes-1' });
      quoteDetailRepository.count.mockResolvedValue(0);
      clothesRepository.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteClothes('clothes-1', 'tenant-1');

      expect(clothesRepository.softDelete).toHaveBeenCalledWith({
        id: 'clothes-1',
        tenantId: 'tenant-1',
      });
      expect(result).toEqual({ message: 'Clothes item successfully deleted' });
    });
  });
});
