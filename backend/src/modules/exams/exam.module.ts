import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';

@Module({imports:[AuthModule, DatabaseModule],controllers:[ExamController],providers:[ExamService]})
export class ExamModule{}
