import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/api/pagination-query.dto';
export class ReportQueryDto extends PaginationQueryDto {
 @ApiPropertyOptional({default:1,minimum:1}) page=1;
 @ApiPropertyOptional({default:20,minimum:1,maximum:100}) limit=20;
 @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() studentId?:string;
 @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() classId?:string;
 @ApiPropertyOptional({format:'uuid'}) @IsOptional() @IsUUID() examId?:string;
 @ApiPropertyOptional({example:'2026-W42'}) @IsOptional() @Matches(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/) week?:string;
 @ApiPropertyOptional({example:'2026-10'}) @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month?:string;
}
