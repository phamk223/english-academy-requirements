import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamSectionResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({format:'uuid'}) examVersionId!:string;
  @ApiProperty({minimum:1}) order!:number;
  @ApiProperty({enum:['READING','LISTENING','WRITING','SPEAKING']}) type!:string;
  @ApiProperty({type:'object',additionalProperties:true}) config!:Record<string,unknown>;
}
export class ExamQuestionOptionResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({minimum:1}) order!:number;
  @ApiProperty({type:'object',additionalProperties:true}) content!:Record<string,unknown>;
}
export class ExamQuestionResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({format:'uuid'}) sectionId!:string;
  @ApiProperty({minimum:1}) order!:number;
  @ApiProperty({enum:['MULTIPLE_CHOICE','TRUE_FALSE','CHOOSE_CORRECT','SHORT_ANSWER','MATCHING']}) type!:string;
  @ApiProperty() prompt!:string;
  @ApiProperty({type:'object',additionalProperties:true}) content!:Record<string,unknown>;
  @ApiProperty({type:[ExamQuestionOptionResponseDto]}) options!:ExamQuestionOptionResponseDto[];
  @ApiPropertyOptional({type:'object',additionalProperties:true,description:'Only returned to ADMIN and TEACHER'}) answerKey?:Record<string,unknown>;
}
export class DeletedExamContentResponseDto {
  @ApiProperty() deleted!:boolean;
  @ApiProperty({format:'uuid'}) id!:string;
}
export class ReorderedQuestionsResponseDto {
  @ApiProperty({format:'uuid'}) sectionId!:string;
  @ApiProperty({type:[String],description:'Question IDs in their new order'}) questionIds!:string[];
}
