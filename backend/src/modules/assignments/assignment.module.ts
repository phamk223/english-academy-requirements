import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
@Module({imports:[AuthModule,DatabaseModule],controllers:[AssignmentController],providers:[AssignmentService]})
export class AssignmentModule{}
