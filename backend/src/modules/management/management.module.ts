import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { StudentsController, TeachersController, ClassesController } from './management.controller';
import { ManagementService } from './management.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({ imports:[AuthModule, DatabaseModule, AccountsModule],controllers:[StudentsController,TeachersController,ClassesController],providers:[ManagementService] })
export class ManagementModule{}
