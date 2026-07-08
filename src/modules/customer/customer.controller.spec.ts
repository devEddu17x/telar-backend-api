import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from './services/customer-internal.service';

describe('CustomerController', () => {
  let controller: CustomerController;
  let service: {
    createCustomer: jest.Mock;
    getAllCustomers: jest.Mock;
    searchCustomers: jest.Mock;
    updateCustomer: jest.Mock;
  };

  const user = { tenantId: 'tenant-1' };

  beforeEach(async () => {
    service = {
      createCustomer: jest.fn(),
      getAllCustomers: jest.fn(),
      searchCustomers: jest.fn(),
      updateCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [{ provide: CustomerService, useValue: service }],
    }).compile();

    controller = module.get(CustomerController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createCustomer', () => {
    it('delega en customerService.createCustomer con el tenantId', async () => {
      const dto = { names: 'Juan' } as any;
      service.createCustomer.mockResolvedValue({ id: 'cust-1' });

      const result = await controller.createCustomer(dto, user);

      expect(service.createCustomer).toHaveBeenCalledWith(dto, user.tenantId);
      expect(result).toEqual({ id: 'cust-1' });
    });
  });

  describe('getAllCustomers', () => {
    it('delega en customerService.getAllCustomers con el tenantId', async () => {
      service.getAllCustomers.mockResolvedValue([{ id: 'cust-1' }]);

      const result = await controller.getAllCustomers(user);

      expect(service.getAllCustomers).toHaveBeenCalledWith(user.tenantId);
      expect(result).toEqual([{ id: 'cust-1' }]);
    });
  });

  describe('searchCustomers', () => {
    it('delega en customerService.searchCustomers con los filtros', async () => {
      service.searchCustomers.mockResolvedValue([]);

      await controller.searchCustomers(user, 'Juan', 'Perez', '555');

      expect(service.searchCustomers).toHaveBeenCalledWith(
        user.tenantId,
        'Juan',
        'Perez',
        '555',
      );
    });
  });

  describe('updateCustomer', () => {
    it('delega en customerService.updateCustomer', async () => {
      const dto = { names: 'Nuevo' } as any;
      service.updateCustomer.mockResolvedValue({
        id: 'cust-1',
        names: 'Nuevo',
      });

      const result = await controller.updateCustomer(dto, 'cust-1', user);

      expect(service.updateCustomer).toHaveBeenCalledWith(
        'cust-1',
        dto,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'cust-1', names: 'Nuevo' });
    });
  });
});
