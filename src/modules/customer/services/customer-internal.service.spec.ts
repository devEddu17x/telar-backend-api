import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer-internal.service';
import { CustomerEntity } from '../entities/customer.entity';

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(CustomerEntity), useValue: repository },
      ],
    }).compile();

    service = module.get(CustomerService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createCustomer', () => {
    it('crea el cliente exitosamente', async () => {
      const dto = { names: 'Juan', lastNames: 'Perez' } as any;
      repository.create.mockReturnValue({ ...dto, tenantId: 'tenant-1' });
      repository.save.mockResolvedValue({ id: 'cust-1', ...dto });

      const result = await service.createCustomer(dto, 'tenant-1');

      expect(result).toEqual({ id: 'cust-1', ...dto });
    });

    it('lanza BadRequestException si no se pudo guardar', async () => {
      repository.create.mockReturnValue({});
      repository.save.mockResolvedValue(null);

      await expect(
        service.createCustomer({} as any, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllCustomers', () => {
    it('lanza NotFoundException si no hay clientes', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.getAllCustomers('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si falla la consulta', async () => {
      repository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getAllCustomers('tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devuelve los clientes encontrados', async () => {
      repository.find.mockResolvedValue([{ id: 'cust-1' }]);

      const result = await service.getAllCustomers('tenant-1');

      expect(result).toEqual([{ id: 'cust-1' }]);
    });
  });

  describe('getCustomerById', () => {
    it('lanza NotFoundException si el cliente no existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getCustomerById('cust-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve el cliente encontrado', async () => {
      repository.findOne.mockResolvedValue({ id: 'cust-1' });

      const result = await service.getCustomerById('cust-1', 'tenant-1');

      expect(result).toEqual({ id: 'cust-1' });
    });
  });

  describe('updateCustomer', () => {
    it('lanza NotFoundException si no se actualizó ninguna fila', async () => {
      repository.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.updateCustomer('cust-1', {} as any, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve el cliente actualizado', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOne.mockResolvedValue({ id: 'cust-1', names: 'Nuevo' });

      const result = await service.updateCustomer(
        'cust-1',
        { names: 'Nuevo' } as any,
        'tenant-1',
      );

      expect(result).toEqual({ id: 'cust-1', names: 'Nuevo' });
    });
  });

  describe('searchCustomers', () => {
    it('devuelve un array vacío si no se pasa ningún filtro', async () => {
      const result = await service.searchCustomers('tenant-1');

      expect(result).toEqual([]);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('busca clientes con los filtros provistos', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 'cust-1' }]);

      const result = await service.searchCustomers('tenant-1', 'Juan');

      expect(result).toEqual([{ id: 'cust-1' }]);
    });

    it('lanza BadRequestException si falla la búsqueda', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('DB error'));

      await expect(service.searchCustomers('tenant-1', 'Juan')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
