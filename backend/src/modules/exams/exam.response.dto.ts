import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ExamVersionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({ type: 'array', items: { type: 'object' }, example: [{ title: 'Section 1: Listening' }] }) sections!: object[];
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED'] }) status!: string;
  @ApiPropertyOptional({ format: 'date-time' }) publishedAt?: string | null;
}
export class ExamResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) status!: string;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ type: ExamVersionResponseDto, nullable: true }) publishedVersion!: ExamVersionResponseDto | null;
  @ApiPropertyOptional({ type: ExamVersionResponseDto, nullable: true }) draftVersion?: ExamVersionResponseDto | null;
}
