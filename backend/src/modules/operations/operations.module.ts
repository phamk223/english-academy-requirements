import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { AuditInterceptor } from './audit.interceptor';
@Module({imports:[DatabaseModule],providers:[{provide:APP_INTERCEPTOR,useClass:AuditInterceptor}]})
export class OperationsModule{}
