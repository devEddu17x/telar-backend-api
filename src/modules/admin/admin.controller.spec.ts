import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ROLES } from 'src/common/enum/roles';

describe('AdminController', () => {
  let controller: AdminController;
  let service: {
    getAllRoles: jest.Mock;
    updateEmployeeRole: jest.Mock;
    revokeEmployeeRole: jest.Mock;
    createEmployee: jest.Mock;
    getAllEmployees: jest.Mock;
    deleteEmployee: jest.Mock;
    reactivateEmployee: jest.Mock;
  };

  const fakeUser = {
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: [ROLES.OWNER],
    email: 'owner@empresa.com',
  };

  beforeEach(async () => {
    service = {
      getAllRoles: jest.fn(),
      updateEmployeeRole: jest.fn(),
      revokeEmployeeRole: jest.fn(),
      createEmployee: jest.fn(),
      getAllEmployees: jest.fn(),
      deleteEmployee: jest.fn(),
      reactivateEmployee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: service }],
    }).compile();

    controller = module.get(AdminController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllRoles', () => {
    it('delega en adminService.getAllRoles', async () => {
      service.getAllRoles.mockResolvedValue(Object.values(ROLES));

      const result = await controller.getAllRoles();

      expect(service.getAllRoles).toHaveBeenCalled();
      expect(result).toEqual(Object.values(ROLES));
    });
  });

  describe('promoteEmployeeRole', () => {
    it('llama a adminService.updateEmployeeRole con los datos del dto y del usuario actual', async () => {
      const dto = { email: 'empleado@empresa.com', role: ROLES.ADMIN };
      service.updateEmployeeRole.mockResolvedValue({ success: true });

      const result = await controller.promoteEmployeeRole(dto as any, fakeUser);

      expect(service.updateEmployeeRole).toHaveBeenCalledWith(
        dto.email,
        dto.role,
        fakeUser.tenantId,
        fakeUser.roles,
        fakeUser.sub,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('revokeEmployeeRole', () => {
    it('llama a adminService.revokeEmployeeRole con los datos del dto y del usuario actual', async () => {
      const dto = { email: 'empleado@empresa.com', role: ROLES.ADMIN };
      service.revokeEmployeeRole.mockResolvedValue({ success: true });

      const result = await controller.revokeEmployeeRole(dto as any, fakeUser);

      expect(service.revokeEmployeeRole).toHaveBeenCalledWith(
        dto.email,
        dto.role,
        fakeUser.tenantId,
        fakeUser.roles,
        fakeUser.sub,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('createEmployee', () => {
    it('llama a adminService.createEmployee con el dto, tenantId y roles del usuario', async () => {
      const dto = { email: 'nuevo@empresa.com', name: 'Nuevo Empleado' };
      service.createEmployee.mockResolvedValue({ id: 'emp-1' });

      const result = await controller.createEmployee(dto as any, fakeUser);

      expect(service.createEmployee).toHaveBeenCalledWith(
        dto,
        fakeUser.tenantId,
        fakeUser.roles,
      );
      expect(result).toEqual({ id: 'emp-1' });
    });
  });

  describe('getAllEmployees', () => {
    it('llama a adminService.getAllEmployees con el tenantId del usuario', async () => {
      service.getAllEmployees.mockResolvedValue([{ id: 'emp-1' }]);

      const result = await controller.getAllEmployees(fakeUser);

      expect(service.getAllEmployees).toHaveBeenCalledWith(fakeUser.tenantId);
      expect(result).toEqual([{ id: 'emp-1' }]);
    });
  });

  describe('deleteEmployee', () => {
    it('llama a adminService.deleteEmployee con id, tenantId, roles y email del usuario', async () => {
      service.deleteEmployee.mockResolvedValue({ success: true });

      const result = await controller.deleteEmployee('emp-1', fakeUser);

      expect(service.deleteEmployee).toHaveBeenCalledWith(
        'emp-1',
        fakeUser.tenantId,
        fakeUser.roles,
        fakeUser.email,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('reactivateEmployee', () => {
    it('llama a adminService.reactivateEmployee con id, tenantId, roles y email del usuario', async () => {
      service.reactivateEmployee.mockResolvedValue({ success: true });

      const result = await controller.reactivateEmployee('emp-1', fakeUser);

      expect(service.reactivateEmployee).toHaveBeenCalledWith(
        'emp-1',
        fakeUser.tenantId,
        fakeUser.roles,
        fakeUser.email,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
