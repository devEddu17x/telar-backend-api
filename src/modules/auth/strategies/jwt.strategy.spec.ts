import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => 'test-secret-provider'),
}));

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'cognito.region': 'us-east-1',
          'cognito.userPoolId': 'pool-123',
          'cognito.clientId': 'client-123',
        };
        return values[key];
      }),
    };

    strategy = new JwtStrategy(configService as unknown as ConfigService);
  });

  describe('validate', () => {
    it('lanza UnauthorizedException si falta "sub" en el payload', async () => {
      await expect(
        strategy.validate({ email: 'user@empresa.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si falta "email" en el payload', async () => {
      await expect(strategy.validate({ sub: 'user-1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devuelve el usuario con tenantId y roles vacíos si no vienen en el token', async () => {
      const result = await strategy.validate({
        sub: 'user-1',
        email: 'user@empresa.com',
      });

      expect(result).toEqual({
        sub: 'user-1',
        email: 'user@empresa.com',
        tenantId: null,
        roles: [],
      });
    });

    it('mapea tenantId y roles de los claims custom de Cognito', async () => {
      const result = await strategy.validate({
        sub: 'user-1',
        email: 'user@empresa.com',
        'custom:tenant_id': 'tenant-1',
        'cognito:groups': ['owner'],
      });

      expect(result).toEqual({
        sub: 'user-1',
        email: 'user@empresa.com',
        tenantId: 'tenant-1',
        roles: ['owner'],
      });
    });
  });
});
