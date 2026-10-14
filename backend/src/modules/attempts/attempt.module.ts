import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AttemptController } from './attempt.controller';
import { AttemptService } from './attempt.service';
import { ScoringService } from './scoring.service';
@Module({imports:[DatabaseModule,AuthModule],controllers:[AttemptController],providers:[AttemptService,ScoringService]})
export class AttemptModule{}
