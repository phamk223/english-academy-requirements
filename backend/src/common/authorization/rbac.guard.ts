import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, AuthenticatedRequest } from '../../modules/auth/auth.guard';
import { ACCESS_POLICY, AccessPolicy } from './access.decorators';
import { hasPermission } from './permissions';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthGuard) private readonly authentication: AuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // A method policy overrides the controller policy. No policy means deny by default.
    const policy = this.reflector.getAllAndOverride<AccessPolicy>(ACCESS_POLICY,
      [context.getHandler(), context.getClass()]);
    if (policy?.type === 'public') return true;
    // Always authenticate before authorization, even for a route with no policy.
    await this.authentication.canActivate(context);
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().currentUser;
    if (policy?.type === 'authenticated') return true;
    if (policy?.type === 'roles' && policy.roles.some(role => user.roles.includes(role))) return true;
    if (policy?.type === 'permission' && hasPermission(user.roles, policy.permission)) return true;
    throw new ForbiddenException();
  }
}
