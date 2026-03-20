import { SetMetadata } from '@nestjs/common';

export type RoleName = 'superadmin' | 'admin' | 'user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
