import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AdminService } from './admin.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { EmployeeService } from '../../modules/employee/employee.service';
import { CREATABLE_ROLES, ROLES } from 'src/common/enum/roles';

describe('AdminService authorization rules', () => {
  let service: AdminService;
  let authService: Record<string, jest.Mock>;
  let employeeService: Record<string, jest.Mock>;

  const targetEmployee = {
    id: 'employee-1',
    sub: 'target-sub',
    email: 'target@example.com',
    tenantId: 'tenant-1',
  };

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
      getEmployee: jest.fn(),
      getEmployeeByEmail: jest.fn(),
      updateEmployee: jest.fn(),
      getAllEmployees: jest.fn(),
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

  it('does not allow a non-owner to create an admin employee', async () => {
    await expect(
      service.createEmployee(
        {
          email: 'new-admin@example.com',
          names: 'Ada',
          lastNames: 'Admin',
          role: CREATABLE_ROLES.ADMIN,
        },
        'tenant-1',
        [ROLES.ADMIN],
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.createEmployee).not.toHaveBeenCalled();
  });

  it('does not allow disabling an employee from another tenant', async () => {
    employeeService.getEmployee.mockResolvedValue({
      ...targetEmployee,
      tenantId: 'other-tenant',
    });

    await expect(
      service.deleteEmployee(
        targetEmployee.id,
        'tenant-1',
        [ROLES.OWNER],
        'owner@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.disableUser).not.toHaveBeenCalled();
  });

  it('does not allow disabling the caller account', async () => {
    employeeService.getEmployee.mockResolvedValue(targetEmployee);

    await expect(
      service.deleteEmployee(
        targetEmployee.id,
        'tenant-1',
        [ROLES.OWNER],
        targetEmployee.email,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.disableUser).not.toHaveBeenCalled();
  });

  it('does not allow disabling the owner account', async () => {
    employeeService.getEmployee.mockResolvedValue(targetEmployee);
    authService.getUserRoles.mockResolvedValue([ROLES.OWNER]);

    await expect(
      service.deleteEmployee(
        targetEmployee.id,
        'tenant-1',
        [ROLES.ADMIN],
        'admin@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.disableUser).not.toHaveBeenCalled();
  });

  it('does not allow an admin to disable another admin', async () => {
    employeeService.getEmployee.mockResolvedValue(targetEmployee);
    authService.getUserRoles.mockResolvedValue([ROLES.ADMIN]);

    await expect(
      service.deleteEmployee(
        targetEmployee.id,
        'tenant-1',
        [ROLES.ADMIN],
        'admin@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.disableUser).not.toHaveBeenCalled();
  });

  it('does not allow assigning roles to yourself', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);

    await expect(
      service.updateEmployeeRole(
        targetEmployee.email,
        ROLES.SELLER,
        'tenant-1',
        [ROLES.OWNER],
        targetEmployee.sub,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.addRole).not.toHaveBeenCalled();
  });

  it('does not allow promoting anyone to owner', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);

    await expect(
      service.updateEmployeeRole(
        targetEmployee.email,
        ROLES.OWNER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.addRole).not.toHaveBeenCalled();
  });

  it('does not allow a non-owner to assign the admin role', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);

    await expect(
      service.updateEmployeeRole(
        targetEmployee.email,
        ROLES.ADMIN,
        'tenant-1',
        [ROLES.ADMIN],
        'caller-sub',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.addRole).not.toHaveBeenCalled();
  });

  it('does not allow modifying the owner roles', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);
    authService.getUserRoles.mockResolvedValue([ROLES.OWNER]);

    await expect(
      service.updateEmployeeRole(
        targetEmployee.email,
        ROLES.SELLER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.addRole).not.toHaveBeenCalled();
  });

  it('does not allow revoking the owner role', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);

    await expect(
      service.revokeEmployeeRole(
        targetEmployee.email,
        ROLES.OWNER,
        'tenant-1',
        [ROLES.OWNER],
        'caller-sub',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.removeRole).not.toHaveBeenCalled();
  });

  it('does not allow an admin to revoke the admin role', async () => {
    employeeService.getEmployeeByEmail.mockResolvedValue(targetEmployee);

    await expect(
      service.revokeEmployeeRole(
        targetEmployee.email,
        ROLES.ADMIN,
        'tenant-1',
        [ROLES.ADMIN],
        'caller-sub',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(authService.removeRole).not.toHaveBeenCalled();
  });
});
