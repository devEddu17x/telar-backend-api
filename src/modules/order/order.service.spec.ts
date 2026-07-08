import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm/data-source/DataSource';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { AddressEntity } from './entities/address.entity';
import { QuoteService } from 'src/modules/quote/quote.service';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import { QuoteStatus } from 'src/modules/quote/enums/status.enum';
import { OrderStatus } from './enum/order-status.enum';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: any;
  let addressRepository: any;
  let quoteService: any;
  let clothesService: any;
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
    orderRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    addressRepository = { create: jest.fn() };
    quoteService = { getQuoteById: jest.fn(), updateStatus: jest.fn() };
    clothesService = { checkIfClothesAreDraft: jest.fn() };
    dataSource = { createQueryRunner: jest.fn(() => mockQueryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepository },
        {
          provide: getRepositoryToken(AddressEntity),
          useValue: addressRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: QuoteService, useValue: quoteService },
        { provide: ClothesService, useValue: clothesService },
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const dto = {
      quoteId: 'quote-1',
      deliveryDate: '2026-08-01',
      address: { street: 'Av. Siempre Viva 123' },
    } as any;
    const tenantId = 'tenant-1';

    it('lanza BadRequestException si la cotización está cancelada', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.CANCELLED,
        details: [],
      });

      await expect(service.createOrder(dto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la cotización está rechazada', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.REJECTED,
        details: [],
      });

      await expect(service.createOrder(dto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si la cotización ya fue aprobada', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.APPROVED,
        details: [],
      });

      await expect(service.createOrder(dto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si hay prendas en borrador', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.PENDING,
        details: [{ clothesVariant: { clothesId: 'c1' } }],
      });
      clothesService.checkIfClothesAreDraft.mockResolvedValue({
        hasDrafts: true,
        draftClothes: [{ name: 'Camisa X' }],
      });

      await expect(service.createOrder(dto, tenantId)).rejects.toThrow(
        'Cannot create order. The following clothes are still in draft mode',
      );
    });

    it('crea la orden dentro de una transacción cuando todo es válido', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.PENDING,
        total: 150,
        details: [{ clothesVariant: { clothesId: 'c1' } }],
      });
      clothesService.checkIfClothesAreDraft.mockResolvedValue({
        hasDrafts: false,
        draftClothes: [],
      });
      addressRepository.create.mockReturnValue({ street: dto.address.street });
      orderRepository.create.mockReturnValue({ quoteId: dto.quoteId });
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'address-1' })
        .mockResolvedValueOnce({ id: 'order-1' });
      quoteService.updateStatus.mockResolvedValue(undefined);

      const result = await service.createOrder(dto, tenantId);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(quoteService.updateStatus).toHaveBeenCalledWith(
        dto.quoteId,
        QuoteStatus.APPROVED,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ id: 'order-1' });
    });

    it('hace rollback si falla la transacción', async () => {
      quoteService.getQuoteById.mockResolvedValue({
        status: QuoteStatus.PENDING,
        total: 150,
        details: [{ clothesVariant: { clothesId: 'c1' } }],
      });
      clothesService.checkIfClothesAreDraft.mockResolvedValue({
        hasDrafts: false,
        draftClothes: [],
      });
      addressRepository.create.mockReturnValue({});
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createOrder(dto, tenantId)).rejects.toThrow(
        'DB error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('lanza NotFoundException si la orden no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderById('order-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve la orden encontrada', async () => {
      orderRepository.findOne.mockResolvedValue({ id: 'order-1' });

      const result = await service.getOrderById('order-1', 'tenant-1');

      expect(result).toEqual({ id: 'order-1' });
    });
  });

  describe('updateOrderStatus', () => {
    it('lanza NotFoundException si la orden no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('order-1', OrderStatus.DONE, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si pasa a DONE sin estar en IN_PRODUCTION', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.updateOrderStatus('order-1', OrderStatus.DONE, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la orden ya está CANCELLED', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.updateOrderStatus(
          'order-1',
          OrderStatus.IN_PRODUCTION,
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la orden ya está DONE', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DONE,
      });

      await expect(
        service.updateOrderStatus(
          'order-1',
          OrderStatus.IN_PRODUCTION,
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza el estado exitosamente', async () => {
      orderRepository.findOne
        .mockResolvedValueOnce({
          id: 'order-1',
          status: OrderStatus.IN_PRODUCTION,
        })
        .mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.DONE });
      orderRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateOrderStatus(
        'order-1',
        OrderStatus.DONE,
        'tenant-1',
      );

      expect(result).toEqual({ id: 'order-1', status: OrderStatus.DONE });
    });
  });

  describe('cancelOrder', () => {
    it('lanza NotFoundException si la orden no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelOrder('order-1', 'motivo', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la orden no está en IN_PRODUCTION', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DONE,
      });

      await expect(
        service.cancelOrder('order-1', 'motivo', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancela la orden exitosamente', async () => {
      orderRepository.findOne
        .mockResolvedValueOnce({
          id: 'order-1',
          status: OrderStatus.IN_PRODUCTION,
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          status: OrderStatus.CANCELLED,
        });
      orderRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.cancelOrder('order-1', 'motivo', 'tenant-1');

      expect(orderRepository.update).toHaveBeenCalledWith(
        { id: 'order-1', tenantId: 'tenant-1' },
        { status: OrderStatus.CANCELLED, cancellationReason: 'motivo' },
      );
      expect(result).toEqual({ id: 'order-1', status: OrderStatus.CANCELLED });
    });
  });

  describe('getOrders', () => {
    it('lanza NotFoundException si no hay órdenes', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [],
        raw: [],
      });

      await expect(service.getOrders('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el resumen de órdenes mapeado', async () => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: 'order-1',
            total: 150,
            status: OrderStatus.IN_PRODUCTION,
            createdAt: new Date(),
            deliveryDate: new Date(),
            quoteId: 'quote-1',
            address: {
              id: 'address-1',
              department: 'Lima',
              city: 'Lima',
              district: 'Miraflores',
              street: 'Av 123',
            },
          },
        ],
        raw: [
          {
            customer_id: 'cust-1',
            customer_names: 'Juan',
            customer_lastNames: 'Perez',
            customer_phone: '555',
            totalClothes: '2',
            totalUnitsToProduced: '10',
          },
        ],
      });

      const result = await service.getOrders('tenant-1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'order-1',
          totalClothes: 2,
          totalUnitsToProduced: 10,
          customer: expect.objectContaining({ id: 'cust-1', names: 'Juan' }),
        }),
      );
    });
  });

  describe('deleteOrder', () => {
    it('lanza NotFoundException si la orden no existe', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteOrder('order-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si la orden no está CANCELLED', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.IN_PRODUCTION,
      });

      await expect(service.deleteOrder('order-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('elimina la orden exitosamente (soft delete)', async () => {
      orderRepository.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
      });
      orderRepository.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteOrder('order-1', 'tenant-1');

      expect(result).toEqual({ message: 'Order successfully deleted' });
    });
  });
});
