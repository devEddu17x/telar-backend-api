import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireTenantGuard } from './require-tenant.guard';

describe('RequireTenantGuard', () => {
  let guard: RequireTenantGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RequireTenantGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('allows access when @SkipTenantCheck is present', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(buildContext(undefined));

    expect(result).toBe(true);
  });

  it('throws ForbiddenException when the request has no user', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when the user has no tenantId', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() => guard.canActivate(buildContext({ sub: 'user-1' }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the user has tenantId', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(
      buildContext({ sub: 'user-1', tenantId: 'tenant-1' }),
    );

    expect(result).toBe(true);
  });
});
