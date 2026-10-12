import { SetMetadata } from '@nestjs/common';
import { Permission, Role } from './permissions';

export const ACCESS_POLICY = 'academy:access-policy';
export type AccessPolicy =
  | { type: 'public' }
  | { type: 'authenticated' }
  | { type: 'roles'; roles: readonly Role[] }
  | { type: 'permission'; permission: Permission };

export const Public = () => SetMetadata(ACCESS_POLICY, { type: 'public' } satisfies AccessPolicy);
export const Authenticated = () => SetMetadata(ACCESS_POLICY, { type: 'authenticated' } satisfies AccessPolicy);
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(ACCESS_POLICY, { type: 'roles', roles } satisfies AccessPolicy);
export const RequirePermission = (permission: Permission) =>
  SetMetadata(ACCESS_POLICY, { type: 'permission', permission } satisfies AccessPolicy);
