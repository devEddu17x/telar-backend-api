import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES } from '../../../common/enum/roles';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { get: jest.Mock };

  const buildContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('allows access when the route does not require roles', async () => {
    reflector.get.mockReturnValue(undefined);

    const result = await guard.canActivate(buildContext({ roles: [] }));

    expect(result).toBe(true);
  });

  it('uses method-level roles before controller-level roles', async () => {
    reflector.get
      .mockReturnValueOnce([ROLES.ADMIN])
      .mockReturnValueOnce([ROLES.SELLER]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.ADMIN] }),
    );

    expect(result).toBe(true);
  });

  it('denies access when the user has no roles', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(buildContext({ roles: [] }));

    expect(result).toBe(false);
  });

  it('denies access when the user has none of the required roles', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.SELLER] }),
    );

    expect(result).toBe(false);
  });

  it('always allows owners regardless of the required roles', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.OWNER] }),
    );

    expect(result).toBe(true);
  });

  it('allows access when the user has any required role', async () => {
    reflector.get
      .mockReturnValueOnce([ROLES.ADMIN, ROLES.SELLER])
      .mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.SELLER] }),
    );

    expect(result).toBe(true);
  });
});
