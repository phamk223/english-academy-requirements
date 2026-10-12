import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManagedPersonDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'INACTIVE'] }) status!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) code?: string | null;
  @ApiPropertyOptional({ format: 'date-time' }) createdAt?: string;
  @ApiPropertyOptional({ writeOnly: true, description: 'Shown once on creation or password reset' }) temporaryPassword?: string;
}
export class ManagedClassDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() classCode!: string;
  @ApiProperty() className!: string;
  @ApiPropertyOptional({ nullable: true }) description?: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] }) status!: string;
}
export class ClassMemberDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) studentCode?: string | null;
}
export class MembershipResultDto {
  @ApiProperty({ format: 'uuid' }) classId!: string;
  @ApiProperty({ format: 'uuid' }) studentId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
