import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/api/pagination-query.dto';

export class CreatePersonDto {
  @ApiProperty({ example: 'student01', minLength: 1, maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  username!: string;
  @ApiProperty({ example: 'Alex Nguyen', maxLength: 150 })
  @IsString() @MinLength(1) @MaxLength(150)
  displayName!: string;
  @ApiPropertyOptional({ example: 'alex@example.com', maxLength: 254 })
  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string;
  @ApiPropertyOptional({ example: 'STU-1001', maxLength: 50 })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
  code?: string;
}

export class UpdatePersonDto {
  @ApiPropertyOptional({ example: 'Alex Nguyen', maxLength: 150 })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(150)
  displayName?: string;
  @ApiPropertyOptional({ example: 'alex@example.com', maxLength: 254, nullable: true })
  @IsOptional() @IsEmail() @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional({ example: 'STU-1001', maxLength: 50, nullable: true })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
  code?: string | null;
}

export class StatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'LOCKED', 'INACTIVE']) status!: string;
}

export class PersonListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'alex', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LOCKED', 'INACTIVE'] })
  @IsOptional() @IsIn(['ACTIVE', 'LOCKED', 'INACTIVE'])
  status?: string;
}

export class CreateClassDto {
  @ApiProperty({ example: 'ENG-A1', maxLength: 50 })
  @IsString() @MinLength(1) @MaxLength(50)
  classCode!: string;
  @ApiProperty({ example: 'English A1', maxLength: 150 })
  @IsString() @MinLength(1) @MaxLength(150)
  className!: string;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string | null;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(150)
  className?: string;
  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string | null;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class ClassListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'A1', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] })
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
  status?: string;
}

export class MembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}

export class TeacherAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teacherId!: string;
}
