import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ManagementModule } from './modules/management/management.module';
import { ExamModule } from './modules/exams/exam.module';

@Module({ imports: [HealthModule, AuthModule, ManagementModule, ExamModule] })
export class AppModule {}
