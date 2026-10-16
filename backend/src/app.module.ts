import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ManagementModule } from './modules/management/management.module';
import { ExamModule } from './modules/exams/exam.module';
import { MediaModule } from './modules/media/media.module';
import { AssignmentModule } from './modules/assignments/assignment.module';
import { AttemptModule } from './modules/attempts/attempt.module';
import { ListeningModule } from './modules/listening/listening.module';
import { ImportModule } from './modules/imports/import.module';
import { ReportsModule } from './modules/reports/reports.module';
import { OperationsModule } from './modules/operations/operations.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({ imports: [HealthModule, AuthModule, ManagementModule, MediaModule, AssignmentModule, ExamModule, AttemptModule, ListeningModule, ImportModule, ReportsModule, OperationsModule, AccountsModule] })
export class AppModule {}
