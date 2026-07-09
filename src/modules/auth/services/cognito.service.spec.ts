import {
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { CognitoService } from './cognito.service';

describe('CognitoService', () => {
  let service: CognitoService;
  let sendMock: jest.Mock;
  let logger: { setContext: jest.Mock; error: jest.Mock; info: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    logger = { setContext: jest.fn(), error: jest.fn(), info: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'cognito.region': 'us-east-1',
          'cognito.userPoolId': 'pool-123',
          'cognito.clientId': 'client-123',
          'cognito.internalAuthToken': 'internal-token',
        };
        return values[key];
      }),
    };

    service = new CognitoService(
      logger as unknown as PinoLogger,
      configService as unknown as ConfigService,
    );

    // Reemplazamos el cliente real de AWS por un mock del método .send()
    sendMock = jest.fn();
    (service as any).cognitoClient = { send: sendMock };
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signUpUser', () => {
    const params = {
      email: 'owner@empresa.com',
      name: 'Juan',
      lastName: 'Perez',
      password: 'secret123',
    };

    it('devuelve el usuario creado en caso exitoso', async () => {
      sendMock.mockResolvedValue({ UserSub: 'sub-1' });

      const result = await service.signUpUser(params);

      expect(result).toEqual({ user: { UserSub: 'sub-1' } });
    });

    it('lanza ConflictException si el usuario ya existe', async () => {
      sendMock.mockRejectedValue({ name: 'UsernameExistsException' });

      await expect(service.signUpUser(params)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza InternalServerErrorException ante cualquier otro error de Cognito', async () => {
      sendMock.mockRejectedValue({
        name: 'InternalErrorException',
        message: 'boom',
      });

      await expect(service.signUpUser(params)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('adminCreateUser', () => {
    const params = { email: 'emp@empresa.com', name: 'Ana', lastName: 'Lopez' };

    it('devuelve el usuario creado en caso exitoso', async () => {
      sendMock.mockResolvedValue({ User: { Attributes: [] } });

      const result = await service.adminCreateUser(params, 'tenant-1');

      expect(result).toEqual({ user: { User: { Attributes: [] } } });
    });

    it('lanza ConflictException si el usuario ya existe', async () => {
      sendMock.mockRejectedValue({ name: 'UsernameExistsException' });

      await expect(service.adminCreateUser(params, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getUserRoles', () => {
    it('devuelve la lista de nombres de grupos', async () => {
      sendMock.mockResolvedValue({
        Groups: [{ GroupName: 'owner' }, { GroupName: 'seller' }],
      });

      const result = await service.getUserRoles('user@empresa.com');

      expect(result).toEqual(['owner', 'seller']);
    });

    it('devuelve un array vacío si no hay grupos', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.getUserRoles('user@empresa.com');

      expect(result).toEqual([]);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotFoundException' });

      await expect(service.getUserRoles('user@empresa.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addRole', () => {
    it('asigna el rol sin errores', async () => {
      sendMock.mockResolvedValue({});
      await expect(
        service.addRole('user@empresa.com', 'admin'),
      ).resolves.toBeUndefined();
    });

    it('lanza BadRequestException si el rol no existe', async () => {
      sendMock.mockRejectedValue({ name: 'ResourceNotFoundException' });

      await expect(
        service.addRole('user@empresa.com', 'rol-inexistente'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotFoundException' });

      await expect(
        service.addRole('user@empresa.com', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('lanza BadRequestException si el usuario no tiene el rol', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotInGroupException' });

      await expect(
        service.removeRole('user@empresa.com', 'admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableUser / enableUser', () => {
    it('lanza NotFoundException al deshabilitar un usuario inexistente', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotFoundException' });

      await expect(service.disableUser('user@empresa.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException al habilitar un usuario inexistente', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotFoundException' });

      await expect(service.enableUser('user@empresa.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUser', () => {
    it('devuelve success:true si Cognito elimina al usuario', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.deleteUser('user@empresa.com');

      expect(result).toEqual({ success: true });
    });

    it('devuelve success:false si Cognito falla (no lanza excepción)', async () => {
      const error = new Error('cognito down');
      sendMock.mockRejectedValue(error);

      const result = await service.deleteUser('user@empresa.com');

      expect(result).toEqual({ success: false, error });
    });
  });

  describe('confirmSignUp', () => {
    it('confirma el usuario exitosamente', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.confirmSignUp('user@empresa.com', '123456');

      expect(result).toEqual({ message: 'User confirmed successfully' });
    });

    it('lanza BadRequestException si el código es incorrecto', async () => {
      sendMock.mockRejectedValue({ name: 'CodeMismatchException' });

      await expect(
        service.confirmSignUp('user@empresa.com', '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el código expiró', async () => {
      sendMock.mockRejectedValue({ name: 'ExpiredCodeException' });

      await expect(
        service.confirmSignUp('user@empresa.com', '000000'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUserAttributes', () => {
    it('no llama a Cognito si no se pasan atributos', async () => {
      await service.updateUserAttributes('user@empresa.com');

      expect(sendMock).not.toHaveBeenCalled();
    });

    it('actualiza los atributos cuando se proveen nombres', async () => {
      sendMock.mockResolvedValue({});

      await service.updateUserAttributes('user@empresa.com', 'Juan', 'Perez');

      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('resendConfirmationCode', () => {
    it('lanza BadRequestException si Cognito falla', async () => {
      sendMock.mockRejectedValue({ name: 'LimitExceededException' });

      await expect(
        service.resendConfirmationCode('user@empresa.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateAuth', () => {
    it('devuelve los tokens en caso exitoso', async () => {
      sendMock.mockResolvedValue({
        AuthenticationResult: {
          AccessToken: 'access',
          IdToken: 'id',
          RefreshToken: 'refresh',
        },
      });

      const result = await service.initiateAuth(
        'user@empresa.com',
        'secret123',
      );

      expect(result).toEqual({
        accessToken: 'access',
        idToken: 'id',
        refreshToken: 'refresh',
      });
    });

    it('lanza UnauthorizedException con credenciales inválidas', async () => {
      sendMock.mockRejectedValue({ name: 'NotAuthorizedException' });

      await expect(
        service.initiateAuth('user@empresa.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza BadRequestException si el email no está confirmado', async () => {
      sendMock.mockRejectedValue({ name: 'UserNotConfirmedException' });

      await expect(
        service.initiateAuth('user@empresa.com', 'secret123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearTenantId', () => {
    it('no lanza error aunque Cognito falle (es un rollback best-effort)', async () => {
      sendMock.mockRejectedValue(new Error('cognito down'));

      await expect(
        service.clearTenantId('user@empresa.com'),
      ).resolves.toBeUndefined();
    });
  });
});
