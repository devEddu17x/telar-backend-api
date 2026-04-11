import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '../constants/roles';

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

    return true;
  }

  private matchRoles(requiredRoles: string[], userRoles: string[]): boolean {
    if (userRoles.includes(ROLES.ADMIN)) {
      return true;
    }
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
