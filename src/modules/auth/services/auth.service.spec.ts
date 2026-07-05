import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { CognitoService } from './cognito.service';
import { EmployeeService } from 'src/modules/employee/employee.service';
import { ROLES, CREATABLE_ROLES } from '../../../common/enum/roles';

describe('AuthService', () => {
  let service: AuthService;
  let cognitoService: Record<string, jest.Mock>;
  let employeeService: Record<string, jest.Mock>;

  beforeEach(async () => {
    cognitoService = {
      signUpUser: jest.fn(),
      addRole: jest.fn(),
      removeRole: jest.fn(),
      deleteUser: jest.fn(),
      adminCreateUser: jest.fn(),
      getUserRoles: jest.fn(),
      updateUserAttributes: jest.fn(),
      disableUser: jest.fn(),
      enableUser: jest.fn(),
      confirmSignUp: jest.fn(),
      resendConfirmationCode: jest.fn(),
      initiateAuth: jest.fn(),
    };
    employeeService = { createEmployee: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
          },
        },
        { provide: CognitoService, useValue: cognitoService },
        { provide: EmployeeService, useValue: employeeService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createOwner', () => {
    const params = {
      email: 'owner@empresa.com',
      name: 'Juan',
      lastName: 'Perez',
      password: 'secret123',
    };

    it('crea el owner exitosamente en Cognito y en la base de datos', async () => {
      cognitoService.signUpUser.mockResolvedValue({
        user: { UserSub: 'sub-1' },
      });
      cognitoService.addRole.mockResolvedValue(undefined);
      employeeService.createEmployee.mockResolvedValue({ id: 'emp-1' });

      const result = await service.createOwner(params);

      expect(cognitoService.addRole).toHaveBeenCalledWith(
        params.email,
        ROLES.OWNER,
      );
      expect(employeeService.createEmployee).toHaveBeenCalledWith('sub-1', {
        email: params.email,
        names: params.name,
        lastNames: params.lastName,
      });
      expect(result).toEqual({ id: 'emp-1' });
    });

    it('hace rollback en Cognito si falla la asignación de rol', async () => {
      cognitoService.signUpUser.mockResolvedValue({
        user: { UserSub: 'sub-1' },
      });
      cognitoService.addRole.mockRejectedValue(new Error('cognito down'));
      cognitoService.deleteUser.mockResolvedValue({ success: true });

      await expect(service.createOwner(params)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(cognitoService.deleteUser).toHaveBeenCalledWith(params.email);
      expect(employeeService.createEmployee).not.toHaveBeenCalled();
    });

    it('hace rollback en Cognito si falla la creación en base de datos', async () => {
      cognitoService.signUpUser.mockResolvedValue({
        user: { UserSub: 'sub-1' },
      });
      cognitoService.addRole.mockResolvedValue(undefined);
      employeeService.createEmployee.mockRejectedValue(new Error('db down'));
      cognitoService.deleteUser.mockResolvedValue({ success: true });

      await expect(service.createOwner(params)).rejects.toThrow(
        BadRequestException,
      );
      expect(cognitoService.deleteUser).toHaveBeenCalledWith(params.email);
    });
  });

  describe('createEmployee', () => {
    const params = { email: 'emp@empresa.com', name: 'Ana', lastName: 'Lopez' };
    const tenantId = 'tenant-1';

    it('lanza InternalServerErrorException si Cognito no devuelve un "sub"', async () => {
      cognitoService.adminCreateUser.mockResolvedValue({
        user: { User: { Attributes: [] } },
      });
      cognitoService.deleteUser.mockResolvedValue({ success: true });

      await expect(
        service.createEmployee(params, CREATABLE_ROLES.SELLER, tenantId),
      ).rejects.toThrow(InternalServerErrorException);
      expect(cognitoService.deleteUser).toHaveBeenCalledWith(params.email);
    });

    it('crea el empleado exitosamente cuando todo funciona', async () => {
      cognitoService.adminCreateUser.mockResolvedValue({
        user: { User: { Attributes: [{ Name: 'sub', Value: 'sub-1' }] } },
      });
      cognitoService.addRole.mockResolvedValue(undefined);
      employeeService.createEmployee.mockResolvedValue({ id: 'emp-1' });

      const result = await service.createEmployee(
        params,
        CREATABLE_ROLES.SELLER,
        tenantId,
      );

      expect(employeeService.createEmployee).toHaveBeenCalledWith(
        'sub-1',
        { email: params.email, names: params.name, lastNames: params.lastName },
        tenantId,
      );
      expect(result).toEqual({ id: 'emp-1' });
    });

    it('hace rollback si falla la asignación de rol', async () => {
      cognitoService.adminCreateUser.mockResolvedValue({
        user: { User: { Attributes: [{ Name: 'sub', Value: 'sub-1' }] } },
      });
      cognitoService.addRole.mockRejectedValue(new Error('cognito down'));
      cognitoService.deleteUser.mockResolvedValue({ success: true });

      await expect(
        service.createEmployee(params, CREATABLE_ROLES.SELLER, tenantId),
      ).rejects.toThrow(InternalServerErrorException);
      expect(cognitoService.deleteUser).toHaveBeenCalledWith(params.email);
    });

    it('hace rollback si falla la creación en base de datos', async () => {
      cognitoService.adminCreateUser.mockResolvedValue({
        user: { User: { Attributes: [{ Name: 'sub', Value: 'sub-1' }] } },
      });
      cognitoService.addRole.mockResolvedValue(undefined);
      employeeService.createEmployee.mockRejectedValue(new Error('db down'));
      cognitoService.deleteUser.mockResolvedValue({ success: true });

      await expect(
        service.createEmployee(params, CREATABLE_ROLES.SELLER, tenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('métodos delegados simples', () => {
    it('getUserRoles delega en cognitoService', async () => {
      cognitoService.getUserRoles.mockResolvedValue([ROLES.SELLER]);
      const result = await service.getUserRoles('user@empresa.com');
      expect(cognitoService.getUserRoles).toHaveBeenCalledWith(
        'user@empresa.com',
      );
      expect(result).toEqual([ROLES.SELLER]);
    });

    it('addRole delega en cognitoService', async () => {
      await service.addRole('user@empresa.com', ROLES.ADMIN);
      expect(cognitoService.addRole).toHaveBeenCalledWith(
        'user@empresa.com',
        ROLES.ADMIN,
      );
    });

    it('removeRole delega en cognitoService', async () => {
      await service.removeRole('user@empresa.com', ROLES.ADMIN);
      expect(cognitoService.removeRole).toHaveBeenCalledWith(
        'user@empresa.com',
        ROLES.ADMIN,
      );
    });

    it('disableUser delega en cognitoService', async () => {
      await service.disableUser('user@empresa.com');
      expect(cognitoService.disableUser).toHaveBeenCalledWith(
        'user@empresa.com',
      );
    });

    it('enableUser delega en cognitoService', async () => {
      await service.enableUser('user@empresa.com');
      expect(cognitoService.enableUser).toHaveBeenCalledWith(
        'user@empresa.com',
      );
    });

    it('confirmEmail delega en cognitoService.confirmSignUp', async () => {
      await service.confirmEmail('user@empresa.com', '123456');
      expect(cognitoService.confirmSignUp).toHaveBeenCalledWith(
        'user@empresa.com',
        '123456',
      );
    });

    it('resendConfirmationCode delega en cognitoService', async () => {
      await service.resendConfirmationCode('user@empresa.com');
      expect(cognitoService.resendConfirmationCode).toHaveBeenCalledWith(
        'user@empresa.com',
      );
    });
  });

  describe('login', () => {
    it('devuelve los tokens si la autenticación es exitosa', async () => {
      cognitoService.initiateAuth.mockResolvedValue({ accessToken: 'token' });

      const result = await service.login('user@empresa.com', 'secret123');

      expect(result).toEqual({ accessToken: 'token' });
    });

    it('propaga el error si la autenticación falla', async () => {
      cognitoService.initiateAuth.mockRejectedValue(
        new Error('invalid credentials'),
      );

      await expect(
        service.login('user@empresa.com', 'wrong-password'),
      ).rejects.toThrow('invalid credentials');
    });
  });
});
