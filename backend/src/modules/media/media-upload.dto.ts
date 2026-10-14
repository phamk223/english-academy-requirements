import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class MediaUploadFieldsDto {
  @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() sectionId?:string;
  @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() questionId?:string;
  @ApiPropertyOptional({minimum:1,maximum:86400}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(86400) durationSeconds?:number;
}
