import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

describe('TenantController', () => {
  let controller: TenantController;
  let service: { createTenant: jest.Mock; getTenantById: jest.Mock };

  beforeEach(async () => {
    service = { createTenant: jest.fn(), getTenantById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [{ provide: TenantService, useValue: service }],
    }).compile();

    controller = module.get(TenantController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('setupTenant', () => {
    it('delega en tenantService.createTenant con el email y sub del usuario', async () => {
      const dto = { name: 'Mi Empresa' } as any;
      const user = { email: 'owner@empresa.com', sub: 'user-1' };
      service.createTenant.mockResolvedValue({ id: 'tenant-1' });

      const result = await controller.setupTenant(dto, user);

      expect(service.createTenant).toHaveBeenCalledWith(
        dto,
        user.email,
        user.sub,
      );
      expect(result).toEqual({ id: 'tenant-1' });
    });
  });

  describe('getTenant', () => {
    it('lanza ForbiddenException si el usuario pide un tenant que no es el suyo', async () => {
      const user = { tenantId: 'tenant-1' };

      await expect(controller.getTenant('tenant-2', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.getTenantById).not.toHaveBeenCalled();
    });

    it('devuelve el tenant si el usuario pide el suyo propio', async () => {
      const user = { tenantId: 'tenant-1' };
      service.getTenantById.mockResolvedValue({ id: 'tenant-1' });

      const result = await controller.getTenant('tenant-1', user);

      expect(service.getTenantById).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ id: 'tenant-1' });
    });
  });
});
