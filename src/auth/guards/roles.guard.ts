import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '../../common/enum/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const methodRoles =
      this.reflector.get<string[]>('roles', context.getHandler()) || [];
    const controllerRoles =
      this.reflector.get<string[]>('roles', context.getClass()) || [];

    const requiredRoles =
      methodRoles.length > 0 ? methodRoles : controllerRoles;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    return this.matchRoles(requiredRoles, user.roles);
  }

  private matchRoles(requiredRoles: string[], userRoles: string[]): boolean {
    if (userRoles.includes(ROLES.OWNER)) {
      return true;
    }
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
