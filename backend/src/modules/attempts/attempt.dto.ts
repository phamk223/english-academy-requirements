import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttemptAnswerDto {
  @ApiProperty({format:'uuid'}) @IsUUID() questionId!:string;
  @ApiProperty({type:'object',additionalProperties:true,example:{text:'hello'}}) @IsObject() answer!:Record<string,unknown>;
}
export class SaveAttemptAnswersDto {
  @ApiProperty({type:[AttemptAnswerDto]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({each:true}) @Type(()=>AttemptAnswerDto) answers!:AttemptAnswerDto[];
}
