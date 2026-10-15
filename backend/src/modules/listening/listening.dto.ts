import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsIn, IsNumber, IsUUID, Max, Min } from 'class-validator';
export class CreateListeningSessionDto {
 @ApiProperty({format:'uuid'}) @IsUUID() attemptId!:string;
 @ApiProperty({format:'uuid'}) @IsUUID() sectionId!:string;
 @ApiProperty({format:'uuid'}) @IsUUID() mediaId!:string;
}
export class PlaybackEventDto {
 @ApiProperty({format:'uuid'}) @IsUUID() eventId!:string;
 @ApiProperty({enum:['PLAY','PAUSE','SEEK','HEARTBEAT','END']}) @IsIn(['PLAY','PAUSE','SEEK','HEARTBEAT','END']) type!:string;
 @ApiProperty({description:'Playback position in seconds',minimum:0,maximum:86400}) @IsNumber({allowNaN:false,allowInfinity:false}) @Min(0) @Max(86400) position!:number;
 @ApiProperty({format:'date-time'}) @IsISO8601({strict:true}) clientTimestamp!:string;
}
