import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ManagementModule } from './modules/management/management.module';
import { ExamModule } from './modules/exams/exam.module';
import { MediaModule } from './modules/media/media.module';
import { AssignmentModule } from './modules/assignments/assignment.module';
import { AttemptModule } from './modules/attempts/attempt.module';

@Module({ imports: [HealthModule, AuthModule, ManagementModule, MediaModule, AssignmentModule, ExamModule, AttemptModule] })
export class AppModule {}
