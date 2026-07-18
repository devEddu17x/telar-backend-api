import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => 'test-secret-provider'),
}));

import { passportJwtSecret } from 'jwks-rsa';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('uses the configured Cognito endpoint for local token validation', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'cognito.region': 'us-east-1',
        'cognito.userPoolId': 'local_pool',
        'cognito.clientId': 'client-123',
        'cognito.endpoint': 'http://localhost:9229/',
      };
      return values[key];
    });

    new JwtStrategy(configService as unknown as ConfigService);

    expect(passportJwtSecret).toHaveBeenLastCalledWith(
      expect.objectContaining({
        jwksUri: 'http://localhost:9229/local_pool/.well-known/jwks.json',
      }),
    );
  });

  describe('validate', () => {
    it('throws UnauthorizedException when the payload is missing "sub"', async () => {
      await expect(
        strategy.validate({ email: 'user@empresa.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the payload is missing "email"', async () => {
      await expect(strategy.validate({ sub: 'user-1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns a user with empty tenantId and roles when optional claims are missing', async () => {
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

    it('maps tenantId and roles from Cognito custom claims', async () => {
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
