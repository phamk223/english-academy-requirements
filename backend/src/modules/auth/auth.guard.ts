import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, CurrentUser } from './auth.service';

export type AuthenticatedRequest = Request & { currentUser: CurrentUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(request.headers.authorization ?? '');
    if (!match || match[1].length > 4096) throw new UnauthorizedException();
    request.currentUser = await this.auth.authenticate(match[1]);
    return true;
  }
}
