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

  it('permite el acceso si el decorador @SkipTenantCheck está presente', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(buildContext(undefined));

    expect(result).toBe(true);
  });

  it('lanza ForbiddenException si no hay usuario en el request', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('lanza ForbiddenException si el usuario no tiene tenantId', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    expect(() => guard.canActivate(buildContext({ sub: 'user-1' }))).toThrow(
      ForbiddenException,
    );
  });

  it('permite el acceso si el usuario tiene tenantId', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(
      buildContext({ sub: 'user-1', tenantId: 'tenant-1' }),
    );

    expect(result).toBe(true);
  });
});
