import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QuoteService } from './quote.service';
import { QuoteEntity } from './entities/quote.entity';
import { QuoteDetailEntity } from './entities/quote-detail.entity';
import { CustomerService } from 'src/modules/customer/services/customer-internal.service';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import { ClothesVariantsService } from 'src/modules/clothes/services/clothes-variants.service';
import { QuoteStatus } from './enums/status.enum';

describe('QuoteService', () => {
  let service: QuoteService;
  let quoteRepository: any;
  let quoteDetailRepository: any;
  let customerService: any;
  let clothesService: any;
  let clothesVariantsService: any;
  let dataSource: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    },
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawAndEntities: jest.fn(),
  };

  beforeEach(async () => {
    quoteRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    quoteDetailRepository = { create: jest.fn() };
    customerService = { getCustomerById: jest.fn() };
    clothesService = { getClothesByIdsArray: jest.fn() };
    clothesVariantsService = { getClothesVariantsByIdsArray: jest.fn() };
    dataSource = { createQueryRunner: jest.fn(() => mockQueryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: getRepositoryToken(QuoteEntity), useValue: quoteRepository },
        {
          provide: getRepositoryToken(QuoteDetailEntity),
          useValue: quoteDetailRepository,
        },
        { provide: CustomerService, useValue: customerService },
        { provide: ClothesService, useValue: clothesService },
        { provide: ClothesVariantsService, useValue: clothesVariantsService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(QuoteService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createQuote', () => {
    const dto = {
      customerId: 'cust-1',
      details: [
        { clothesVariantId: 'variant-1', quantity: 2, customizations: [] },
      ],
    } as any;

    it('lanza BadRequestException si las customizaciones exceden la cantidad', async () => {
      const dtoInvalido = {
        ...dto,
        details: [
          {
            clothesVariantId: 'variant-1',
            quantity: 1,
            customizations: ['a', 'b'],
          },
        ],
      };

      await expect(
        service.createQuote(dtoInvalido, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
      expect(customerService.getCustomerById).not.toHaveBeenCalled();
    });

    it('crea la cotización con sus detalles dentro de una transacción', async () => {
      customerService.getCustomerById.mockResolvedValue({ id: 'cust-1' });
      clothesVariantsService.getClothesVariantsByIdsArray.mockResolvedValue([
        { id: 'variant-1', clothesId: 'clothes-1', additional: 5 },
      ]);
      clothesService.getClothesByIdsArray.mockResolvedValue([
        { id: 'clothes-1', price: 50 },
      ]);
      quoteRepository.create.mockReturnValue({ customerId: 'cust-1' });
      quoteDetailRepository.create.mockImplementation((data) => data);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'quote-1', total: 110 })
        .mockResolvedValueOnce([{ id: 'detail-1' }]);

      const result = await service.createQuote(dto, 'tenant-1');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'quote-1',
        total: 110,
        details: [{ id: 'detail-1' }],
      });
    });

    it('hace rollback si falla la transacción', async () => {
      customerService.getCustomerById.mockResolvedValue({ id: 'cust-1' });
      clothesVariantsService.getClothesVariantsByIdsArray.mockResolvedValue([
        { id: 'variant-1', clothesId: 'clothes-1', additional: 5 },
      ]);
      clothesService.getClothesByIdsArray.mockResolvedValue([
        { id: 'clothes-1', price: 50 },
      ]);
      quoteRepository.create.mockReturnValue({});
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createQuote(dto, 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getQuoteById', () => {
    it('lanza NotFoundException si la cotización no existe', async () => {
      quoteRepository.findOne.mockResolvedValue(null);

      await expect(service.getQuoteById('quote-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve la cotización encontrada', async () => {
      quoteRepository.findOne.mockResolvedValue({ id: 'quote-1' });

      const result = await service.getQuoteById('quote-1', 'tenant-1');

      expect(result).toEqual({ id: 'quote-1' });
    });
  });

  describe('updateStatus', () => {
    it('lanza NotFoundException si la cotización no existe', async () => {
      quoteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('quote-1', QuoteStatus.APPROVED),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la cotización ya está cancelada', async () => {
      quoteRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.CANCELLED,
      });

      await expect(
        service.updateStatus('quote-1', QuoteStatus.APPROVED),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza el estado exitosamente', async () => {
      quoteRepository.findOne
        .mockResolvedValueOnce({ id: 'quote-1', status: QuoteStatus.PENDING })
        .mockResolvedValueOnce({ id: 'quote-1', status: QuoteStatus.APPROVED });
      quoteRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateStatus(
        'quote-1',
        QuoteStatus.APPROVED,
      );

      expect(result).toEqual({ id: 'quote-1', status: QuoteStatus.APPROVED });
    });
  });

  describe('cancelQuote', () => {
    it('lanza NotFoundException si la cotización no existe', async () => {
      quoteRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelQuote('quote-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si la cotización no está PENDING', async () => {
      quoteRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.APPROVED,
      });

      await expect(service.cancelQuote('quote-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancela la cotización exitosamente', async () => {
      quoteRepository.findOne
        .mockResolvedValueOnce({ id: 'quote-1', status: QuoteStatus.PENDING })
        .mockResolvedValueOnce({
          id: 'quote-1',
          status: QuoteStatus.CANCELLED,
        });
      quoteRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.cancelQuote('quote-1', 'tenant-1');

      expect(result).toEqual({ id: 'quote-1', status: QuoteStatus.CANCELLED });
    });
  });

  describe('updateQuote', () => {
    const dto = {
      details: [
        { clothesVariantId: 'variant-1', quantity: 2, customizations: [] },
      ],
    } as any;

    it('lanza BadRequestException si hay variantes duplicadas', async () => {
      const dtoInvalido = {
        details: [
          { clothesVariantId: 'variant-1', quantity: 1, customizations: [] },
          { clothesVariantId: 'variant-1', quantity: 2, customizations: [] },
        ],
      };

      await expect(
        service.updateQuote('quote-1', dtoInvalido, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si la cotización no existe', async () => {
      quoteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuote('quote-1', dto, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la cotización no está PENDING', async () => {
      quoteRepository.findOne.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.APPROVED,
      });

      await expect(
        service.updateQuote('quote-1', dto, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza la cotización exitosamente', async () => {
      quoteRepository.findOne
        .mockResolvedValueOnce({
          id: 'quote-1',
          status: QuoteStatus.PENDING,
          customerId: 'cust-1',
        })
        .mockResolvedValueOnce({ id: 'quote-1', total: 110 });
      clothesVariantsService.getClothesVariantsByIdsArray.mockResolvedValue([
        { id: 'variant-1', clothesId: 'clothes-1', additional: 5 },
      ]);
      clothesService.getClothesByIdsArray.mockResolvedValue([
        { id: 'clothes-1', price: 50 },
      ]);
      quoteDetailRepository.create.mockImplementation((data) => data);
      mockQueryRunner.manager.save.mockResolvedValue([{ id: 'detail-1' }]);

      const result = await service.updateQuote('quote-1', dto, 'tenant-1');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'quote-1',
        total: 110,
        details: [{ id: 'detail-1' }],
      });
    });
  });

  describe('getAll / getQuotesByStatus', () => {
    it('lanza NotFoundException si no hay cotizaciones', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await expect(service.getAll('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el resumen de cotizaciones mapeado', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: 'quote-1',
            total: 100,
            customerId: 'cust-1',
            status: QuoteStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            customer: {
              id: 'cust-1',
              names: 'Juan',
              lastNames: 'Perez',
              phone: '555',
            },
          },
        ],
        raw: [{ totalClothes: '1', totalUnitsToProduced: '2' }],
      });

      const result = await service.getAll('tenant-1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'quote-1',
          totalClothes: 1,
          totalUnitsToProduced: 2,
        }),
      );
    });
  });

  describe('deleteQuote', () => {
    it('lanza NotFoundException si la cotización no existe', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.deleteQuote('quote-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('lanza BadRequestException si la cotización está APPROVED', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.APPROVED,
      });

      await expect(service.deleteQuote('quote-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('elimina la cotización exitosamente', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.PENDING,
      });
      mockQueryRunner.manager.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteQuote('quote-1', 'tenant-1');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Quote successfully deleted' });
    });
  });
});
