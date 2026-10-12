import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { AuthenticatedRequest } from './auth.guard';
import { Public, RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() body: LoginDto) { return this.auth.login(body.username, body.password); }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: RefreshTokenDto) { return this.auth.refresh(body.refreshToken); }

  @Post('logout')
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async logout(@Body() body: RefreshTokenDto) {
    await this.auth.logout(body.refreshToken);
    return null;
  }

  @Get('me')
  @RequirePermission(Permission.SELF_READ)
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthenticatedRequest) { return request.currentUser; }
}
