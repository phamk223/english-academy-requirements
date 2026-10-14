import { Injectable } from '@nestjs/common';
import { ApiValidationException } from '../../common/api/validation';

export const normalizeText=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
@Injectable()
export class ScoringService {
  validate(type:string,answer:Record<string,unknown>,optionIds:string[],field='answer') {
    const fail=()=>{throw new ApiValidationException([{field,code:'questionAnswerType',message:'Answer does not match the question type or option set'}]);};
    const exact=(key:string)=>Object.keys(answer).length===1 && Object.hasOwn(answer,key);
    if(['MULTIPLE_CHOICE','CHOOSE_CORRECT'].includes(type)){
      const ids=answer.selectedOptionIds;
      if(!exact('selectedOptionIds')||!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||!uuid.test(id)||!optionIds.includes(id))||new Set(ids).size!==ids.length||(type==='CHOOSE_CORRECT'&&ids.length>1))fail();
    }else if(type==='TRUE_FALSE'){if(!exact('value')||typeof answer.value!=='boolean')fail();}
    else if(type==='SHORT_ANSWER'){if(!exact('text')||typeof answer.text!=='string'||answer.text.length>10000)fail();}
    else if(type==='MATCHING'){
      if(!exact('pairs')||!Array.isArray(answer.pairs)||answer.pairs.length>100||answer.pairs.some(p=>!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==2||typeof p.left!=='string'||typeof p.right!=='string'||p.left.length>2000||p.right.length>2000))fail();
    }else fail();
  }
  grade(type:string,sectionType:string,answer:Record<string,unknown>,key:Record<string,any>|null,optionIds:string[]){
    if(['WRITING','SPEAKING'].includes(sectionType)||!key||!['MULTIPLE_CHOICE','CHOOSE_CORRECT','TRUE_FALSE','SHORT_ANSWER','MATCHING'].includes(type))return{score:0,maxScore:1,gradingStatus:'NEEDS_MANUAL_GRADING'};
    let correct=false;
    if(['MULTIPLE_CHOICE','CHOOSE_CORRECT'].includes(type)){
      const expected=key.correctOptionIndexes?.map((i:number)=>optionIds[i]);
      const selected=answer.selectedOptionIds;
      correct=Array.isArray(expected)&&expected.length>0&&expected.every((id:unknown)=>typeof id==='string')&&Array.isArray(selected)&&selected.length===expected.length&&expected.every((id:string)=>selected.includes(id));
    }else if(type==='TRUE_FALSE')correct=typeof answer.value==='boolean'&&answer.value===key.value;
    else if(type==='SHORT_ANSWER')correct=typeof answer.text==='string'&&Array.isArray(key.acceptedAnswers)&&key.acceptedAnswers.some((s:unknown)=>typeof s==='string'&&normalizeText(s)===normalizeText(answer.text as string));
    else if(type==='MATCHING'){
      const canonical=(pairs:any[])=>pairs.map(p=>JSON.stringify([p.left.trim(),p.right.trim()])).sort();
      correct=Array.isArray(answer.pairs)&&Array.isArray(key.pairs)&&JSON.stringify(canonical(answer.pairs))===JSON.stringify(canonical(key.pairs));
    }
    return{score:correct?1:0,maxScore:1,gradingStatus:'GRADED'};
  }
}
