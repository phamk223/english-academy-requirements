import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ExamContentController } from './exam-content.controller';
import { ExamContentService } from './exam-content.service';

@Module({imports:[AuthModule, DatabaseModule],controllers:[ExamController,ExamContentController],providers:[ExamService,ExamContentService]})
export class ExamModule{}
