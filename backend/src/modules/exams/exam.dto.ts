import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/api/pagination-query.dto';

export class ExamSectionDto {
  @ApiProperty({ example: 'Section 1: Listening', maxLength: 200 })
  @IsString() @MinLength(1) @MaxLength(200)
  title!: string;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 600 })
  @IsOptional() @IsInt() @Min(1) @Max(600)
  durationMinutes?: number;
}

export class CreateExamDto {
  @ApiProperty({ example: 'Mid-term English A1', maxLength: 200 })
  @IsString() @MinLength(1) @MaxLength(200)
  title!: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional() @IsString() @MaxLength(10000)
  description?: string | null;
  @ApiPropertyOptional({ type: [ExamSectionDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExamSectionDto)
  sections?: ExamSectionDto[];
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' })
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}

export class UpdateExamDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200)
  title?: string;
  @ApiPropertyOptional({ maxLength: 10000, nullable: true })
  @IsOptional() @IsString() @MaxLength(10000)
  description?: string | null;
  @ApiPropertyOptional({ type: [ExamSectionDto], maxItems: 50 })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExamSectionDto)
  sections?: ExamSectionDto[];
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED'] })
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}

export class ExamListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: string;
  @ApiPropertyOptional({ example: 'mid-term', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
