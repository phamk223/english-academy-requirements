import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/api/pagination-query.dto';
export class CreateAssignmentDto {
  @IsOptional() @IsUUID() studentId?:string;
  @IsOptional() @IsUUID() classId?:string;
  @IsOptional() @IsISO8601() dueAt?:string;
}
export class AssignmentListQueryDto extends PaginationQueryDto {}
