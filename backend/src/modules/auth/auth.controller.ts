import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { AuthenticatedRequest } from './auth.guard';
import { Public, RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { CurrentUserDto, TokenResponseDto } from './auth.response.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '1. Login and obtain access/refresh tokens' })
  @ApiSuccess(TokenResponseDto)
  @ApiErrors(400, 401, 413, 429, 500)
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() body: LoginDto) { return this.auth.login(body.username, body.password); }

  @Post('refresh')
  @ApiOperation({ summary: '3. Rotate refresh token', description: 'Replace both tokens after success. Reusing a consumed refresh token revokes the session.' })
  @ApiSuccess(TokenResponseDto)
  @ApiErrors(400, 401, 413, 429, 500)
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: RefreshTokenDto) { return this.auth.refresh(body.refreshToken); }

  @Post('logout')
  @ApiOperation({ summary: '4. Logout and revoke session', description: 'Send refreshToken in the body. Idempotent; no Bearer token required.' })
  @ApiSuccess(null)
  @ApiErrors(400, 413, 429, 500)
  @Public()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async logout(@Body() body: RefreshTokenDto) {
    await this.auth.logout(body.refreshToken);
    return null;
  }

  @Get('me')
  @ApiOperation({ summary: '2. Read current user and roles', description: 'Requires Authorize with a valid access token. ADMIN, TEACHER and STUDENT have self:read.' })
  @ApiBearerAuth('access-token')
  @ApiSuccess(CurrentUserDto)
  @ApiErrors(401, 403, 429, 500)
  @RequirePermission(Permission.SELF_READ)
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthenticatedRequest) { return request.currentUser; }
}
