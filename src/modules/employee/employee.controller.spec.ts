import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let service: { getMe: jest.Mock; updateMe: jest.Mock };

  const user = { sub: 'user-1', email: 'user@empresa.com', roles: ['admin'] };

  beforeEach(async () => {
    service = { getMe: jest.fn(), updateMe: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [{ provide: EmployeeService, useValue: service }],
    }).compile();

    controller = module.get(EmployeeController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getEmployee', () => {
    it('delega en employeeService.getMe con el sub y los roles del usuario', async () => {
      service.getMe.mockResolvedValue({ id: 'emp-1', roles: user.roles });

      const result = await controller.getEmployee(user);

      expect(service.getMe).toHaveBeenCalledWith(user.sub, user.roles);
      expect(result).toEqual({ id: 'emp-1', roles: user.roles });
    });
  });

  describe('updateEmployee', () => {
    it('delega en employeeService.updateMe con sub, email y dto', async () => {
      const dto = { names: 'Nuevo nombre' } as any;
      service.updateMe.mockResolvedValue({
        id: 'emp-1',
        names: 'Nuevo nombre',
      });

      const result = await controller.updateEmployee(dto, user);

      expect(service.updateMe).toHaveBeenCalledWith(user.sub, user.email, dto);
      expect(result).toEqual({ id: 'emp-1', names: 'Nuevo nombre' });
    });
  });
});
