import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  let service: {
    createOrder: jest.Mock;
    getOrders: jest.Mock;
    getOrderById: jest.Mock;
    updateOrderStatus: jest.Mock;
    cancelOrder: jest.Mock;
    deleteOrder: jest.Mock;
  };

  const user = { tenantId: 'tenant-1' };

  beforeEach(async () => {
    service = {
      createOrder: jest.fn(),
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      updateOrderStatus: jest.fn(),
      cancelOrder: jest.fn(),
      deleteOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: service }],
    }).compile();

    controller = module.get(OrderController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('delega en orderService.createOrder con el tenantId del usuario', async () => {
      const dto = { quoteId: 'quote-1' } as any;
      service.createOrder.mockResolvedValue({ id: 'order-1' });

      const result = await controller.createOrder(dto, user);

      expect(service.createOrder).toHaveBeenCalledWith(dto, user.tenantId);
      expect(result).toEqual({ id: 'order-1' });
    });
  });

  describe('getOrders', () => {
    it('delega en orderService.getOrders con el tenantId', async () => {
      service.getOrders.mockResolvedValue([{ id: 'order-1' }]);

      const result = await controller.getOrders(user);

      expect(service.getOrders).toHaveBeenCalledWith(user.tenantId);
      expect(result).toEqual([{ id: 'order-1' }]);
    });
  });

  describe('getOrderById', () => {
    it('delega en orderService.getOrderById', async () => {
      service.getOrderById.mockResolvedValue({ id: 'order-1' });

      const result = await controller.getOrderById('order-1', user);

      expect(service.getOrderById).toHaveBeenCalledWith(
        'order-1',
        user.tenantId,
      );
      expect(result).toEqual({ id: 'order-1' });
    });
  });

  describe('updateOrderStatus', () => {
    it('delega en orderService.updateOrderStatus con el status del dto', async () => {
      const dto = { status: 'DELIVERED' } as any;
      service.updateOrderStatus.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERED',
      });

      const result = await controller.updateOrderStatus('order-1', dto, user);

      expect(service.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        dto.status,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'order-1', status: 'DELIVERED' });
    });
  });

  describe('cancelOrder', () => {
    it('delega en orderService.cancelOrder con el motivo del dto', async () => {
      const dto = { reason: 'Cliente canceló' };
      service.cancelOrder.mockResolvedValue({
        id: 'order-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancelOrder('order-1', dto as any, user);

      expect(service.cancelOrder).toHaveBeenCalledWith(
        'order-1',
        dto.reason,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'order-1', status: 'CANCELLED' });
    });
  });

  describe('deleteOrder', () => {
    it('delega en orderService.deleteOrder', async () => {
      service.deleteOrder.mockResolvedValue({ message: 'Order deleted' });

      const result = await controller.deleteOrder('order-1', user);

      expect(service.deleteOrder).toHaveBeenCalledWith(
        'order-1',
        user.tenantId,
      );
      expect(result).toEqual({ message: 'Order deleted' });
    });
  });
});
