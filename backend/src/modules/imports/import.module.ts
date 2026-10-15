import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
@Module({imports:[DatabaseModule,AuthModule],controllers:[ImportController],providers:[ImportService]})
export class ImportModule{}
