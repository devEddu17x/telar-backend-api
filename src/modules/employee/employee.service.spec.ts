import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EmployeeService } from './employee.service';
import { EmployeeEntity } from './entities/employee.entity';
import { AuthService } from '../../modules/auth/services/auth.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let authService: { updateUserAttributes: jest.Mock };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };
    authService = { updateUserAttributes: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), error: jest.fn() },
        },
        { provide: getRepositoryToken(EmployeeEntity), useValue: repository },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get(EmployeeService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createEmployee', () => {
    it('crea el empleado exitosamente', async () => {
      const data = { email: 'e@empresa.com', names: 'Ana', lastNames: 'Lopez' };
      repository.create.mockReturnValue({ sub: 'sub-1', ...data });
      repository.save.mockResolvedValue({ id: 'emp-1', sub: 'sub-1', ...data });

      const result = await service.createEmployee('sub-1', data, 'tenant-1');

      expect(result).toEqual({ id: 'emp-1', sub: 'sub-1', ...data });
    });

    it('propaga el error si falla el guardado', async () => {
      repository.create.mockReturnValue({});
      repository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createEmployee('sub-1', {} as any)).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('getEmployee', () => {
    it('lanza NotFoundException si el empleado no existe', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.getEmployee('emp-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el empleado encontrado', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'emp-1' });

      const result = await service.getEmployee('emp-1');

      expect(result).toEqual({ id: 'emp-1' });
    });
  });

  describe('getEmployeeBySub', () => {
    it('lanza NotFoundException si no encuentra el sub', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.getEmployeeBySub('sub-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEmployeeByEmail', () => {
    it('lanza NotFoundException si no encuentra el email', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.getEmployeeByEmail('e@empresa.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignTenantToEmployeeIfUnassigned', () => {
    it('devuelve true si se actualizó alguna fila', async () => {
      repository.update.mockResolvedValue({ affected: 1 });

      const result = await service.assignTenantToEmployeeIfUnassigned(
        'sub-1',
        'tenant-1',
      );

      expect(result).toBe(true);
    });

    it('devuelve false si no se actualizó ninguna fila', async () => {
      repository.update.mockResolvedValue({ affected: 0 });

      const result = await service.assignTenantToEmployeeIfUnassigned(
        'sub-1',
        'tenant-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateEmployee', () => {
    it('lanza BadRequestException si no se pasa un id', async () => {
      await expect(service.updateEmployee('', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si no se actualizó ninguna fila', async () => {
      repository.update.mockResolvedValue({ affected: 0 });

      await expect(service.updateEmployee('emp-1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devuelve el empleado actualizado', async () => {
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOneBy.mockResolvedValue({ id: 'emp-1', names: 'Nuevo' });

      const result = await service.updateEmployee('emp-1', {
        names: 'Nuevo',
      } as any);

      expect(result).toEqual({ id: 'emp-1', names: 'Nuevo' });
    });
  });

  describe('deleteEmployee', () => {
    it('lanza BadRequestException si no se eliminó ninguna fila', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteEmployee('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('elimina exitosamente sin lanzar error', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteEmployee('emp-1')).resolves.toBeUndefined();
    });
  });

  describe('getAllEmployees', () => {
    it('devuelve un array vacío si no hay empleados', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getAllEmployees('tenant-1');

      expect(result).toEqual([]);
    });

    it('devuelve los empleados del tenant', async () => {
      repository.find.mockResolvedValue([{ id: 'emp-1' }]);

      const result = await service.getAllEmployees('tenant-1');

      expect(result).toEqual([{ id: 'emp-1' }]);
    });
  });

  describe('getMe', () => {
    it('devuelve el empleado con sus roles', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'emp-1', sub: 'sub-1' });

      const result = await service.getMe('sub-1', ['admin']);

      expect(result).toEqual({ id: 'emp-1', sub: 'sub-1', roles: ['admin'] });
    });
  });

  describe('updateMe', () => {
    const employee = {
      id: 'emp-1',
      sub: 'sub-1',
      names: 'Viejo',
      lastNames: 'Nombre',
    };

    it('actualiza el perfil sin tocar Cognito si no cambian nombres', async () => {
      repository.findOneBy.mockResolvedValueOnce(employee);
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOneBy.mockResolvedValueOnce({ ...employee, phone: '555' });

      const result = await service.updateMe('sub-1', 'e@empresa.com', {
        phone: '555',
      } as any);

      expect(authService.updateUserAttributes).not.toHaveBeenCalled();
      expect(result).toEqual({ ...employee, phone: '555' });
    });

    it('actualiza Cognito si cambian los nombres', async () => {
      repository.findOneBy.mockResolvedValueOnce(employee);
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOneBy.mockResolvedValueOnce({
        ...employee,
        names: 'Nuevo',
      });
      authService.updateUserAttributes.mockResolvedValue(undefined);

      await service.updateMe('sub-1', 'e@empresa.com', {
        names: 'Nuevo',
      } as any);

      expect(authService.updateUserAttributes).toHaveBeenCalledWith(
        'e@empresa.com',
        'Nuevo',
        undefined,
      );
    });

    it('hace rollback local si falla la actualización en Cognito', async () => {
      repository.findOneBy.mockResolvedValueOnce(employee);
      repository.update.mockResolvedValue({ affected: 1 });
      repository.findOneBy.mockResolvedValueOnce({
        ...employee,
        names: 'Nuevo',
      });
      authService.updateUserAttributes.mockRejectedValue(
        new Error('cognito down'),
      );

      await expect(
        service.updateMe('sub-1', 'e@empresa.com', { names: 'Nuevo' } as any),
      ).rejects.toThrow('cognito down');

      expect(repository.update).toHaveBeenCalledWith('emp-1', {
        names: 'Viejo',
        lastNames: 'Nombre',
      });
    });
  });
});
