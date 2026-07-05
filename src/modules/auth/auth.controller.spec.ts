import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    createOwner: jest.Mock;
    confirmEmail: jest.Mock;
    resendConfirmationCode: jest.Mock;
    login: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createOwner: jest.fn(),
      confirmEmail: jest.fn(),
      resendConfirmationCode: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('delega en authService.createOwner con el dto', async () => {
      const dto = { email: 'owner@empresa.com' } as any;
      service.createOwner.mockResolvedValue({ id: 'owner-1' });

      const result = await controller.register(dto);

      expect(service.createOwner).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'owner-1' });
    });
  });

  describe('confirmEmail', () => {
    it('delega en authService.confirmEmail con email y código', async () => {
      const dto = { email: 'owner@empresa.com', code: '123456' };
      service.confirmEmail.mockResolvedValue({ success: true });

      const result = await controller.confirmEmail(dto as any);

      expect(service.confirmEmail).toHaveBeenCalledWith(dto.email, dto.code);
      expect(result).toEqual({ success: true });
    });
  });

  describe('resendConfirmationCode', () => {
    it('delega en authService.resendConfirmationCode con el email', async () => {
      const dto = { email: 'owner@empresa.com' };
      service.resendConfirmationCode.mockResolvedValue({ success: true });

      const result = await controller.resendConfirmationCode(dto as any);

      expect(service.resendConfirmationCode).toHaveBeenCalledWith(dto.email);
      expect(result).toEqual({ success: true });
    });
  });

  describe('login', () => {
    it('delega en authService.login con email y password', async () => {
      const dto = { email: 'owner@empresa.com', password: 'secret123' };
      service.login.mockResolvedValue({ accessToken: 'token' });

      const result = await controller.login(dto as any);

      expect(service.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(result).toEqual({ accessToken: 'token' });
    });
  });
});
