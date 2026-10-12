import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { AuthGuard } from './auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RbacGuard } from '../../common/authorization/rbac.guard';

@Module({ imports: [DatabaseModule], controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthGuard, RbacGuard,
    { provide: APP_GUARD, useExisting: RbacGuard }],
  exports: [AuthService, AuthGuard, PasswordService, RbacGuard] })
export class AuthModule {}
