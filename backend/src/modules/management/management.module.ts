import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { StudentsController, TeachersController, ClassesController } from './management.controller';
import { ManagementService } from './management.service';

@Module({ imports:[AuthModule, DatabaseModule],controllers:[StudentsController,TeachersController,ClassesController],providers:[ManagementService] })
export class ManagementModule{}
