import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/api/pagination-query.dto';

export const SECTION_TYPES = ['READING', 'LISTENING', 'WRITING', 'SPEAKING'] as const;
export const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'CHOOSE_CORRECT', 'SHORT_ANSWER', 'MATCHING'] as const;

export class CreateSectionDto {
  @ApiProperty({ enum: SECTION_TYPES }) @IsIn(SECTION_TYPES) type!: typeof SECTION_TYPES[number];
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) order?: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() config?: Record<string, unknown>;
}
export class UpdateSectionDto {
  @ApiPropertyOptional({ enum: SECTION_TYPES }) @IsOptional() @IsIn(SECTION_TYPES) type?: typeof SECTION_TYPES[number];
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) order?: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() config?: Record<string, unknown>;
}
export class QuestionListQueryDto extends PaginationQueryDto {}

export class QuestionOptionDto {
  @ApiProperty({ example: 'Choice A' }) @IsString() @MinLength(1) @MaxLength(2000) content!: string;
}
export class CreateQuestionDto {
  @ApiProperty({ enum: QUESTION_TYPES }) @IsIn(QUESTION_TYPES) type!: typeof QUESTION_TYPES[number];
  @ApiProperty({ maxLength: 10000 }) @IsString() @MinLength(1) @MaxLength(10000) prompt!: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() content?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [QuestionOptionDto] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => QuestionOptionDto) options?: QuestionOptionDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() answerKey!: Record<string, unknown>;
}
export class UpdateQuestionDto {
  @ApiPropertyOptional({ enum: QUESTION_TYPES }) @IsOptional() @IsIn(QUESTION_TYPES) type?: typeof QUESTION_TYPES[number];
  @ApiPropertyOptional({ maxLength: 10000 }) @IsOptional() @IsString() @MinLength(1) @MaxLength(10000) prompt?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() content?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [QuestionOptionDto] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => QuestionOptionDto) options?: QuestionOptionDto[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) @IsOptional() @IsObject() answerKey?: Record<string, unknown>;
}
export class ReorderQuestionsDto {
  @ApiProperty({format:'uuid'}) @IsUUID() sectionId!: string;
  @ApiProperty({ type: [String], items: {format:'uuid'} }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsUUID(undefined,{each:true}) questionIds!: string[];
}
