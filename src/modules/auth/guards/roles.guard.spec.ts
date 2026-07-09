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

  it('permite el acceso si la ruta no tiene roles requeridos', async () => {
    reflector.get.mockReturnValue(undefined);

    const result = await guard.canActivate(buildContext({ roles: [] }));

    expect(result).toBe(true);
  });

  it('prioriza los roles definidos en el método por sobre los del controller', async () => {
    reflector.get
      .mockReturnValueOnce([ROLES.ADMIN]) // roles del método
      .mockReturnValueOnce([ROLES.SELLER]); // roles del controller (ignorados)

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.ADMIN] }),
    );

    expect(result).toBe(true);
  });

  it('deniega el acceso si el usuario no tiene roles', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(buildContext({ roles: [] }));

    expect(result).toBe(false);
  });

  it('deniega el acceso si el usuario no tiene ninguno de los roles requeridos', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.SELLER] }),
    );

    expect(result).toBe(false);
  });

  it('el owner siempre tiene acceso, sin importar los roles requeridos', async () => {
    reflector.get.mockReturnValueOnce([ROLES.ADMIN]).mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.OWNER] }),
    );

    expect(result).toBe(true);
  });

  it('permite el acceso si el usuario tiene alguno de los roles requeridos', async () => {
    reflector.get
      .mockReturnValueOnce([ROLES.ADMIN, ROLES.SELLER])
      .mockReturnValueOnce([]);

    const result = await guard.canActivate(
      buildContext({ roles: [ROLES.SELLER] }),
    );

    expect(result).toBe(true);
  });
});
