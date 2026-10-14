import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class AttemptResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({format:'uuid'}) examId!:string;
  @ApiProperty({format:'uuid'}) examVersionId!:string;
  @ApiProperty({format:'uuid'}) studentId!:string;
  @ApiProperty({enum:['NOT_STARTED','IN_PROGRESS','SUBMITTED','GRADED']}) status!:string;
  @ApiProperty({enum:['NOT_GRADED','GRADED','NEEDS_MANUAL_GRADING']}) gradingStatus!:string;
  @ApiProperty({minimum:0}) score!:number;
  @ApiProperty({minimum:0}) maxScore!:number;
  @ApiProperty({format:'date-time'}) startedAt!:string;
  @ApiPropertyOptional({format:'date-time',nullable:true}) submittedAt!:string|null;
  @ApiPropertyOptional({format:'date-time',nullable:true}) gradedAt!:string|null;
  @ApiProperty({type:'object',additionalProperties:true,description:'Pinned version sections/questions/options/media; never contains answerKey'}) exam!:object;
  @ApiProperty({type:'array',items:{type:'object',additionalProperties:true},description:'Saved answer and server-calculated score/maxScore/gradingStatus'}) answers!:object[];
}
