import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AdminService } from './admin.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { EmployeeService } from '../../modules/employee/employee.service';
import { ROLES } from 'src/common/enum/roles';

describe('AdminService', () => {
  let service: AdminService;
  let authService: Record<string, jest.Mock>;
  let employeeService: Record<string, jest.Mock>;

  beforeEach(async () => {
    authService = {
      createEmployee: jest.fn(),
      getUserRoles: jest.fn(),
      disableUser: jest.fn(),
      enableUser: jest.fn(),
      addRole: jest.fn(),
      removeRole: jest.fn(),
    };
    employeeService = {
      getAllEmployees: jest.fn(),
      getEmployee: jest.fn(),
      getEmployeeByEmail: jest.fn(),
      updateEmployee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
        { provide: AuthService, useValue: authService },
        { provide: EmployeeService, useValue: employeeService },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRoles', () => {
    it('devuelve todos los valores del enum ROLES', async () => {
      const result = await service.getAllRoles();
      expect(result).toEqual(Object.values(ROLES));
    });
  });

  describe('createEmployee', () => {
    const dto = {
      email: 'nuevo@empresa.com',
      names: 'Juan',
      lastNames: 'Perez',
      role: ROLES.ADMIN,
    } as any;

    it('lanza ForbiddenException si un no-owner intenta crear un admin', async () => {
      await expect(
        service.createEmployee(dto, 'tenant-1', [ROLES.SELLER]),
      ).rejects.toThrow(ForbiddenException);
      expect(authService.createEmployee).not.toHaveBeenCalled();
    });

    it('crea el empleado cuando el rol es válido para el caller', async () => {
      authService.createEmployee.mockResolvedValue({ id: 'emp-1' });

      const result = await service.createEmployee(dto, 'tenant-1', [
        ROLES.OWNER,
      ]);

      expect(authService.createEmployee).toHaveBeenCalledWith(
        { email: dto.email, name: dto.names, lastName: dto.lastNames },
        dto.role,
        'tenant-1',
      );
      expect(result).toEqual({ id: 'emp-1' });
    });
  });

  describe('getAllEmployees', () => {
    it('devuelve los empleados enriquecidos con sus roles', async () => {
      employeeService.getAllEmployees.mockResolvedValue([
        { id: 'e1', email: 'e1@empresa.com', sub: 's1' },
      ]);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);

      const result = await service.getAllEmployees('tenant-1');

      expect(result).toEqual([
        expect.objectContaining({ id: 'e1', roles: [ROLES.SELLER] }),
      ]);
    });
  });

  describe('deleteEmployee', () => {
    const employee = {
      id: 'emp-1',
      email: 'empleado@empresa.com',
      tenantId: 'tenant-1',
    };

    it('lanza ForbiddenException si el empleado es de otro tenant', async () => {
      employeeService.getEmployee.mockResolvedValue({
        ...employee,
        tenantId: 'otro-tenant',
      });

      await expect(
        service.deleteEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.OWNER],
          'owner@empresa.com',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si intenta deshabilitar su propia cuenta', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);

      await expect(
        service.deleteEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.OWNER],
          employee.email,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si el objetivo es el owner', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.OWNER]);

      await expect(
        service.deleteEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.ADMIN],
          'admin@empresa.com',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si un admin intenta deshabilitar a otro admin', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.ADMIN]);

      await expect(
        service.deleteEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.ADMIN],
          'admin@empresa.com',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deshabilita al empleado exitosamente', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);
      employeeService.updateEmployee.mockResolvedValue(undefined);

      const result = await service.deleteEmployee(
        'emp-1',
        'tenant-1',
        [ROLES.OWNER],
        'owner@empresa.com',
      );

      expect(authService.disableUser).toHaveBeenCalledWith(employee.email);
      expect(employeeService.updateEmployee).toHaveBeenCalledWith('emp-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Employee has been disabled successfully',
      });
    });

    it('hace rollback en Cognito si falla la actualización local', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);
      employeeService.updateEmployee.mockRejectedValue(new Error('DB down'));

      await expect(
        service.deleteEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.OWNER],
          'owner@empresa.com',
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.enableUser).toHaveBeenCalledWith(employee.email);
    });
  });

  describe('reactivateEmployee', () => {
    const employee = {
      id: 'emp-1',
      email: 'empleado@empresa.com',
      tenantId: 'tenant-1',
    };

    it('lanza ForbiddenException si el empleado es de otro tenant', async () => {
      employeeService.getEmployee.mockResolvedValue({
        ...employee,
        tenantId: 'otro-tenant',
      });

      await expect(
        service.reactivateEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.OWNER],
          'owner@empresa.com',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('reactiva al empleado exitosamente', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);
      employeeService.updateEmployee.mockResolvedValue(undefined);

      const result = await service.reactivateEmployee(
        'emp-1',
        'tenant-1',
        [ROLES.OWNER],
        'owner@empresa.com',
      );

      expect(authService.enableUser).toHaveBeenCalledWith(employee.email);
      expect(result).toEqual({
        message: 'Employee has been reactivated successfully',
      });
    });

    it('hace rollback en Cognito si falla la actualización local', async () => {
      employeeService.getEmployee.mockResolvedValue(employee);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);
      employeeService.updateEmployee.mockRejectedValue(new Error('DB down'));

      await expect(
        service.reactivateEmployee(
          'emp-1',
          'tenant-1',
          [ROLES.OWNER],
          'owner@empresa.com',
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(authService.disableUser).toHaveBeenCalledWith(employee.email);
    });
  });

  describe('updateEmployeeRole', () => {
    const target = { sub: 'target-sub', tenantId: 'tenant-1' };

    it('lanza ForbiddenException si el empleado no existe en el tenant', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(null);

      await expect(
        service.updateEmployeeRole(
          'x@x.com',
          ROLES.SELLER,
          'tenant-1',
          [ROLES.OWNER],
          'caller-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si intenta modificar sus propios roles', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);

      await expect(
        service.updateEmployeeRole(
          'x@x.com',
          ROLES.SELLER,
          'tenant-1',
          [ROLES.OWNER],
          'target-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si intenta promover a owner', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);

      await expect(
        service.updateEmployeeRole(
          'x@x.com',
          ROLES.OWNER,
          'tenant-1',
          [ROLES.OWNER],
          'caller-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si un no-owner intenta asignar admin', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);

      await expect(
        service.updateEmployeeRole(
          'x@x.com',
          ROLES.ADMIN,
          'tenant-1',
          [ROLES.ADMIN],
          'caller-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devuelve mensaje informativo si ya tiene el rol', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);

      const result = await service.updateEmployeeRole(
        'x@x.com',
        ROLES.SELLER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      );

      expect(authService.addRole).not.toHaveBeenCalled();
      expect(result.message).toContain('already has the role');
    });

    it('asigna el rol exitosamente', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);
      authService.getUserRoles.mockResolvedValue([]);

      const result = await service.updateEmployeeRole(
        'x@x.com',
        ROLES.SELLER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      );

      expect(authService.addRole).toHaveBeenCalledWith('x@x.com', ROLES.SELLER);
      expect(result.message).toContain('assigned successfully');
    });
  });

  describe('revokeEmployeeRole', () => {
    const target = { sub: 'target-sub', tenantId: 'tenant-1' };

    it('lanza ForbiddenException si intenta revocar el rol owner', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);

      await expect(
        service.revokeEmployeeRole(
          'x@x.com',
          ROLES.OWNER,
          'tenant-1',
          [ROLES.OWNER],
          'caller-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si un admin intenta revocar el rol admin', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);

      await expect(
        service.revokeEmployeeRole(
          'x@x.com',
          ROLES.ADMIN,
          'tenant-1',
          [ROLES.ADMIN],
          'caller-sub',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devuelve mensaje informativo si no tiene el rol', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);

      const result = await service.revokeEmployeeRole(
        'x@x.com',
        ROLES.ADMIN,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      );

      expect(authService.removeRole).not.toHaveBeenCalled();
      expect(result.message).toContain('does not have the role');
    });

    it('revoca el rol exitosamente', async () => {
      employeeService.getEmployeeByEmail.mockResolvedValue(target);
      authService.getUserRoles.mockResolvedValue([ROLES.SELLER]);

      const result = await service.revokeEmployeeRole(
        'x@x.com',
        ROLES.SELLER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      );

      expect(authService.removeRole).toHaveBeenCalledWith(
        'x@x.com',
        ROLES.SELLER,
      );
      expect(result.message).toContain('revoked successfully');
    });
  });
});
