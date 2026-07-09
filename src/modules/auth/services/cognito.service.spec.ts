import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { CognitoService } from './cognito.service';

describe('CognitoService error mapping', () => {
  let service: CognitoService;
  let sendMock: jest.Mock;

  beforeEach(() => {
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    const configService = {
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

    sendMock = jest.fn();
    (service as any).cognitoClient = { send: sendMock };
  });

  afterEach(() => jest.clearAllMocks());

  it('maps duplicated owner signups to ConflictException', async () => {
    sendMock.mockRejectedValue({ name: 'UsernameExistsException' });

    await expect(
      service.signUpUser({
        email: 'owner@example.com',
        name: 'Owner',
        lastName: 'User',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps unexpected owner signup failures to InternalServerErrorException', async () => {
    sendMock.mockRejectedValue({
      name: 'InternalErrorException',
      message: 'boom',
    });

    await expect(
      service.signUpUser({
        email: 'owner@example.com',
        name: 'Owner',
        lastName: 'User',
        password: 'Password123!',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('maps duplicated employee creation to ConflictException', async () => {
    sendMock.mockRejectedValue({ name: 'UsernameExistsException' });

    await expect(
      service.adminCreateUser(
        {
          email: 'employee@example.com',
          name: 'Employee',
          lastName: 'User',
        },
        'tenant-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('maps missing users while reading roles to NotFoundException', async () => {
    sendMock.mockRejectedValue({ name: 'UserNotFoundException' });

    await expect(service.getUserRoles('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps missing users and missing groups while assigning roles', async () => {
    sendMock.mockRejectedValueOnce({ name: 'UserNotFoundException' });

    await expect(
      service.addRole('missing@example.com', 'admin'),
    ).rejects.toThrow(NotFoundException);

    sendMock.mockRejectedValueOnce({ name: 'ResourceNotFoundException' });

    await expect(
      service.addRole('employee@example.com', 'unknown-role'),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps invalid role revocation attempts to BadRequestException', async () => {
    sendMock.mockRejectedValue({ name: 'UserNotInGroupException' });

    await expect(
      service.removeRole('employee@example.com', 'admin'),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps missing users while disabling and enabling accounts', async () => {
    sendMock.mockRejectedValueOnce({ name: 'UserNotFoundException' });

    await expect(service.disableUser('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );

    sendMock.mockRejectedValueOnce({ name: 'UserNotFoundException' });

    await expect(service.enableUser('missing@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns rollback status instead of throwing when deleting a Cognito user fails', async () => {
    const error = new Error('cognito unavailable');
    sendMock.mockRejectedValue(error);

    await expect(service.deleteUser('employee@example.com')).resolves.toEqual({
      success: false,
      error,
    });
  });

  it('maps invalid and expired confirmation codes to BadRequestException', async () => {
    sendMock.mockRejectedValueOnce({ name: 'CodeMismatchException' });

    await expect(
      service.confirmSignUp('owner@example.com', '000000'),
    ).rejects.toThrow(BadRequestException);

    sendMock.mockRejectedValueOnce({ name: 'ExpiredCodeException' });

    await expect(
      service.confirmSignUp('owner@example.com', '000000'),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not call Cognito when no profile attributes are provided', async () => {
    await service.updateUserAttributes('employee@example.com');

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('maps resend confirmation failures to BadRequestException', async () => {
    sendMock.mockRejectedValue({ name: 'LimitExceededException' });

    await expect(
      service.resendConfirmationCode('owner@example.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps invalid login credentials to UnauthorizedException', async () => {
    sendMock.mockRejectedValueOnce({ name: 'NotAuthorizedException' });

    await expect(
      service.initiateAuth('owner@example.com', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);

    sendMock.mockRejectedValueOnce({ name: 'InvalidPasswordException' });

    await expect(
      service.initiateAuth('owner@example.com', 'weak-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps unconfirmed login attempts to BadRequestException', async () => {
    sendMock.mockRejectedValue({ name: 'UserNotConfirmedException' });

    await expect(
      service.initiateAuth('owner@example.com', 'Password123!'),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps tenant rollback best-effort when clearing tenant id fails', async () => {
    sendMock.mockRejectedValue(new Error('cognito unavailable'));

    await expect(
      service.clearTenantId('owner@example.com'),
    ).resolves.toBeUndefined();
  });
});
