import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
@Module({imports:[DatabaseModule,AuthModule],controllers:[ListeningController],providers:[ListeningService]})
export class ListeningModule{}
