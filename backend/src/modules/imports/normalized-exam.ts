import 'reflect-metadata';
import { Type, plainToInstance } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested, validateSync } from 'class-validator';
import { CreateQuestionDto, CreateSectionDto } from '../exams/exam-content.dto';
import { validateAnswer } from '../exams/exam-content.service';
export class NormalizedSection extends CreateSectionDto {
 @IsArray() @ArrayMaxSize(500) @ValidateNested({each:true}) @Type(()=>CreateQuestionDto) questions!:CreateQuestionDto[];
}
export class NormalizedExam {
 @IsString() @MinLength(1) @MaxLength(200) title!:string;
 @IsOptional() @IsString() @MaxLength(10000) description?:string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>NormalizedSection) sections!:NormalizedSection[];
}
export function normalizeExam(raw:unknown){
 const result=plainToInstance(NormalizedExam,raw);if(!result||Array.isArray(result)||validateSync(result,{whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true}).length)throw new Error('INVALID_NORMALIZED_EXAM');
 if(!result.title.trim()||result.sections.reduce((n,s)=>n+s.questions.length,0)>500)throw new Error('INVALID_NORMALIZED_EXAM');
 try{for(const s of result.sections){for(const q of s.questions)validateAnswer(q.type,(q.options??[]).map(o=>o.content),q.answerKey);}}catch{throw new Error('INVALID_ANSWER_KEY');}return result;
}
