import { IsOptional, IsUUID } from 'class-validator';

export class AttachMediaDto {
  @IsOptional() @IsUUID() sectionId?: string;
  @IsOptional() @IsUUID() questionId?: string;
}
