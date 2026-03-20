import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleName } from './roles.decorator';

const ROLE_ID_TO_NAME: Record<number, RoleName> = {
  1: 'superadmin',
  2: 'admin',
  3: 'user',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { roleId?: number } }>();
    const roleId = request.user?.roleId;
    const roleName = typeof roleId === 'number' ? ROLE_ID_TO_NAME[roleId] : undefined;

    if (!roleName || !requiredRoles.includes(roleName)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
