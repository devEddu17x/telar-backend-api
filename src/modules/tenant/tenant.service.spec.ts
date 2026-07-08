import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TenantService } from './tenant.service';
import { TenantEntity } from './entities/tenant.entity';
import { CognitoService } from '../../modules/auth/services/cognito.service';
import { EmployeeService } from '../employee/employee.service';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let cognitoService: { setTenantId: jest.Mock; clearTenantId: jest.Mock };
  let employeeService: {
    getEmployeeBySub: jest.Mock;
    assignTenantToEmployeeIfUnassigned: jest.Mock;
  };

  const dto = { name: 'Mi Empresa' } as any;
  const userEmail = 'owner@empresa.com';
  const userSub = 'user-1';

  beforeEach(async () => {
    tenantRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    cognitoService = { setTenantId: jest.fn(), clearTenantId: jest.fn() };
    employeeService = {
      getEmployeeBySub: jest.fn(),
      assignTenantToEmployeeIfUnassigned: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: tenantRepository,
        },
        { provide: CognitoService, useValue: cognitoService },
        { provide: EmployeeService, useValue: employeeService },
      ],
    }).compile();

    service = module.get(TenantService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createTenant', () => {
    it('lanza BadRequestException si el usuario ya tiene un tenant asignado', async () => {
      employeeService.getEmployeeBySub.mockResolvedValue({
        tenantId: 'tenant-existente',
      });

      await expect(
        service.createTenant(dto, userEmail, userSub),
      ).rejects.toThrow(BadRequestException);
      expect(tenantRepository.save).not.toHaveBeenCalled();
    });

    it('crea el tenant exitosamente y actualiza Cognito', async () => {
      employeeService.getEmployeeBySub.mockResolvedValue({ tenantId: null });
      tenantRepository.create.mockReturnValue(dto);
      tenantRepository.save.mockResolvedValue({ id: 'tenant-1', ...dto });
      employeeService.assignTenantToEmployeeIfUnassigned.mockResolvedValue(
        true,
      );
      cognitoService.setTenantId.mockResolvedValue(undefined);

      const result = await service.createTenant(dto, userEmail, userSub);

      expect(
        employeeService.assignTenantToEmployeeIfUnassigned,
      ).toHaveBeenCalledWith(userSub, 'tenant-1');
      expect(cognitoService.setTenantId).toHaveBeenCalledWith(
        userEmail,
        'tenant-1',
      );
      expect(result).toEqual({ id: 'tenant-1', ...dto });
    });

    it('hace rollback (borra el tenant) si no se pudo asignar al empleado', async () => {
      employeeService.getEmployeeBySub.mockResolvedValue({ tenantId: null });
      tenantRepository.create.mockReturnValue(dto);
      tenantRepository.save.mockResolvedValue({ id: 'tenant-1', ...dto });
      employeeService.assignTenantToEmployeeIfUnassigned.mockResolvedValue(
        false,
      );
      tenantRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(
        service.createTenant(dto, userEmail, userSub),
      ).rejects.toThrow(InternalServerErrorException);
      expect(cognitoService.clearTenantId).not.toHaveBeenCalled();
      expect(tenantRepository.delete).toHaveBeenCalledWith('tenant-1');
    });

    it('hace rollback completo (Cognito + tenant) si falla la actualización en Cognito', async () => {
      employeeService.getEmployeeBySub.mockResolvedValue({ tenantId: null });
      tenantRepository.create.mockReturnValue(dto);
      tenantRepository.save.mockResolvedValue({ id: 'tenant-1', ...dto });
      employeeService.assignTenantToEmployeeIfUnassigned.mockResolvedValue(
        true,
      );
      cognitoService.setTenantId.mockRejectedValue(new Error('cognito down'));
      cognitoService.clearTenantId.mockResolvedValue(undefined);
      tenantRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(
        service.createTenant(dto, userEmail, userSub),
      ).rejects.toThrow(InternalServerErrorException);
      expect(cognitoService.clearTenantId).toHaveBeenCalledWith(userEmail);
      expect(tenantRepository.delete).toHaveBeenCalledWith('tenant-1');
    });

    it('registra el fallo crítico si el rollback del tenant también falla, sin dejar de lanzar el error original', async () => {
      employeeService.getEmployeeBySub.mockResolvedValue({ tenantId: null });
      tenantRepository.create.mockReturnValue(dto);
      tenantRepository.save.mockResolvedValue({ id: 'tenant-1', ...dto });
      employeeService.assignTenantToEmployeeIfUnassigned.mockRejectedValue(
        new ConflictException('conflict'),
      );
      tenantRepository.delete.mockRejectedValue(
        new Error('DB down durante rollback'),
      );

      await expect(
        service.createTenant(dto, userEmail, userSub),
      ).rejects.toThrow(InternalServerErrorException);
      expect(tenantRepository.delete).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('getTenantById', () => {
    it('lanza NotFoundException si el tenant no existe', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.getTenantById('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el tenant encontrado', async () => {
      tenantRepository.findOne.mockResolvedValue({ id: 'tenant-1' });

      const result = await service.getTenantById('tenant-1');

      expect(result).toEqual({ id: 'tenant-1' });
    });
  });
});
