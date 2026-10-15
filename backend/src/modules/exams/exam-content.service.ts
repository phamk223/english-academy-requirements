import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { paginate, PaginatedResult } from '../../common/api/contract';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { CreateQuestionDto, CreateSectionDto, UpdateQuestionDto, UpdateSectionDto } from './exam-content.dto';

type VersionRow={exam_id:string;status:string;created_by:string;published_version_id:string|null;draft_version_id:string|null;version_id:string|null};
const ownerCanManage=(user:CurrentUser,owner:string)=>user.roles.includes('ADMIN')||(user.roles.includes('TEACHER')&&user.id===owner);
const studentOnly=(user:CurrentUser)=>user.roles.includes('STUDENT')&&!user.roles.some(role=>role==='ADMIN'||role==='TEACHER');
const missing=()=>new NotFoundException('Resource not found');
export function validateAnswer(type:string,options:string[],key:Record<string,unknown>){
  const optionTypes=['MULTIPLE_CHOICE','CHOOSE_CORRECT'];
  if(optionTypes.includes(type)){
    if(options.length<2)throw new BadRequestException('This question type requires at least two options');
    const indexes=key.correctOptionIndexes;
    if(!Array.isArray(indexes)||!indexes.length||indexes.some(x=>!Number.isInteger(x)||Number(x)<0||Number(x)>=options.length)||new Set(indexes).size!==indexes.length)throw new BadRequestException('answerKey.correctOptionIndexes must reference valid option indexes');
    if(type==='CHOOSE_CORRECT'&&indexes.length!==1)throw new BadRequestException('CHOOSE_CORRECT requires exactly one correct option');
  }else if(type==='TRUE_FALSE'){
    if(options.length||typeof key.value!=='boolean')throw new BadRequestException('TRUE_FALSE requires answerKey.value as a boolean and no options');
  }else if(type==='SHORT_ANSWER'){
    if(options.length||!Array.isArray(key.acceptedAnswers)||!key.acceptedAnswers.length||key.acceptedAnswers.some(x=>typeof x!=='string'||!x.trim()))throw new BadRequestException('SHORT_ANSWER requires non-empty answerKey.acceptedAnswers');
  }else if(type==='MATCHING'){
    if(options.length||!Array.isArray(key.pairs)||key.pairs.length<2||key.pairs.some(p=>!p||typeof p!=='object'||typeof (p as any).left!=='string'||typeof (p as any).right!=='string'||!(p as any).left.trim()||!(p as any).right.trim()))throw new BadRequestException('MATCHING requires at least two left/right answerKey.pairs');
  }
}

@Injectable()
export class ExamContentService{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{
    const c=await this.db.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(error){await c.query('ROLLBACK');if((error as any)?.code==='23505')throw new ConflictException('Resource already exists');throw error;}finally{c.release();}
  }
  private async examForSection(c:PoolClient,id:string,lock=false){
    const r=await c.query<VersionRow>(`SELECT e.id AS exam_id,e.status,e.created_by,e.published_version_id,
      (SELECT id FROM academy.exam_versions WHERE exam_id=e.id AND status='DRAFT' LIMIT 1) AS draft_version_id,
      (SELECT exam_version_id FROM academy.exam_sections WHERE id=$1 ORDER BY (exam_version_id=(SELECT id FROM academy.exam_versions WHERE exam_id=e.id AND status='DRAFT' LIMIT 1)) DESC LIMIT 1) AS version_id
      FROM academy.exam_sections s JOIN academy.exam_versions v ON v.id=s.exam_version_id JOIN academy.exams e ON e.id=v.exam_id
      WHERE s.id=$1 ORDER BY (v.status='DRAFT') DESC LIMIT 1${lock?' FOR UPDATE OF e':''}`,[id]);
    if(!r.rowCount)throw missing();return r.rows[0];
  }
  private async examForQuestion(c:PoolClient,id:string,lock=false){
    const r=await c.query<VersionRow>(`SELECT e.id AS exam_id,e.status,e.created_by,e.published_version_id,
      (SELECT id FROM academy.exam_versions WHERE exam_id=e.id AND status='DRAFT' LIMIT 1) AS draft_version_id,
      q.exam_version_id AS version_id FROM academy.exam_questions q JOIN academy.exam_versions v ON v.id=q.exam_version_id JOIN academy.exams e ON e.id=v.exam_id
      WHERE q.id=$1 ORDER BY (v.status='DRAFT') DESC LIMIT 1${lock?' FOR UPDATE OF e':''}`,[id]);
    if(!r.rowCount)throw missing();return r.rows[0];
  }
  private async draftVersion(c:PoolClient,user:CurrentUser,examId:string){
    const er=await c.query(`SELECT * FROM academy.exams WHERE id=$1 FOR UPDATE`,[examId]);if(!er.rowCount)throw missing();const exam=er.rows[0];
    if(!ownerCanManage(user,exam.created_by))throw missing();if(exam.status==='ARCHIVED')throw new ConflictException('Archived exams cannot be changed');
    const draft=await c.query(`SELECT id FROM academy.exam_versions WHERE exam_id=$1 AND status='DRAFT'`,[examId]);if(draft.rowCount)return draft.rows[0].id;
    if(!exam.published_version_id)throw new ConflictException('Exam has no editable version');
    const n=await c.query(`SELECT max(version_number)::int AS n FROM academy.exam_versions WHERE exam_id=$1`,[examId]);
    const v=await c.query(`INSERT INTO academy.exam_versions(exam_id,version_number,title,description,sections,status,created_by)
      SELECT exam_id,$2,title,description,sections,'DRAFT',$3 FROM academy.exam_versions WHERE id=$1 RETURNING id`,[exam.published_version_id,n.rows[0].n+1,user.id]);
    const id=v.rows[0].id,source=exam.published_version_id;
    await c.query(`INSERT INTO academy.exam_sections(id,exam_version_id,sort_order,section_type,config,created_at) SELECT id,$2,sort_order,section_type,config,created_at FROM academy.exam_sections WHERE exam_version_id=$1`,[source,id]);
    await c.query(`INSERT INTO academy.exam_questions(id,exam_version_id,section_id,sort_order,question_type,prompt,content,created_at) SELECT id,$2,section_id,sort_order,question_type,prompt,content,created_at FROM academy.exam_questions WHERE exam_version_id=$1`,[source,id]);
    await c.query(`INSERT INTO academy.exam_question_options(id,question_id,exam_version_id,sort_order,content) SELECT id,question_id,$2,sort_order,content FROM academy.exam_question_options WHERE exam_version_id=$1`,[source,id]);
    await c.query(`INSERT INTO academy.exam_answer_keys(question_id,exam_version_id,answer_key,created_at) SELECT question_id,$2,answer_key,created_at FROM academy.exam_answer_keys WHERE exam_version_id=$1`,[source,id]);
    await c.query(`INSERT INTO academy.exam_media_attachments(media_id,exam_version_id,section_id,question_id,created_at) SELECT media_id,$2,section_id,question_id,created_at FROM academy.exam_media_attachments WHERE exam_version_id=$1`,[source,id]);
    return id;
  }
  private async readableVersion(user:CurrentUser,row:VersionRow){
    if(studentOnly(user)){if(row.status!=='PUBLISHED'||!row.published_version_id)throw missing();return row.published_version_id;}
    if(!ownerCanManage(user,row.created_by))throw missing();return row.draft_version_id??row.published_version_id??row.version_id;
  }
  private async reposition(c:PoolClient,versionId:string,table:'academy.exam_sections'|'academy.exam_questions',whereColumn:'exam_version_id'|'section_id',parentId:string,orderedIds:string[]){
    const count=orderedIds.length;if(!count)return;
    const max=await c.query(`SELECT coalesce(max(sort_order),0)::int AS n FROM ${table} WHERE exam_version_id=$1 AND ${whereColumn}=$2`,[versionId,parentId]);
    await c.query(`UPDATE ${table} SET sort_order=sort_order+$3 WHERE exam_version_id=$1 AND ${whereColumn}=$2`,[versionId,parentId,max.rows[0].n+count+1]);
    for(let i=0;i<orderedIds.length;i++)await c.query(`UPDATE ${table} SET sort_order=$3 WHERE id=$1 AND exam_version_id=$2`,[orderedIds[i],versionId,i+1]);
  }
  async createSection(user:CurrentUser,examId:string,input:CreateSectionDto){return this.transaction(async c=>{
    const version=await this.draftVersion(c,user,examId);const existing=await c.query(`SELECT id FROM academy.exam_sections WHERE exam_version_id=$1 ORDER BY sort_order,id`,[version]);
    if(input.order!==undefined&&input.order>existing.rows.length+1)throw new BadRequestException('Section order must be between 1 and the next available position');
    const next=await c.query(`SELECT coalesce(max(sort_order),0)::int+1 AS n FROM academy.exam_sections WHERE exam_version_id=$1`,[version]);
    const id=(await c.query(`INSERT INTO academy.exam_sections(exam_version_id,sort_order,section_type,config) VALUES($1,$2,$3,$4::jsonb) RETURNING id`,[version,next.rows[0].n,input.type,JSON.stringify(input.config??{})])).rows[0].id;
    const ids=existing.rows.map(x=>x.id);ids.splice(Math.min((input.order??ids.length+1)-1,ids.length),0,id);await this.reposition(c,version,'academy.exam_sections','exam_version_id',version,ids);return{id,examVersionId:version,type:input.type,order:ids.indexOf(id)+1,config:input.config??{}};
  });}
  async updateSection(user:CurrentUser,id:string,input:UpdateSectionDto){return this.transaction(async c=>{
    const row=await this.examForSection(c,id);const version=await this.draftVersion(c,user,row.exam_id);const found=await c.query(`SELECT * FROM academy.exam_sections WHERE id=$1 AND exam_version_id=$2`,[id,version]);if(!found.rowCount)throw missing();
    await c.query(`UPDATE academy.exam_sections SET section_type=$3,config=$4::jsonb WHERE id=$1 AND exam_version_id=$2`,[id,version,input.type??found.rows[0].section_type,JSON.stringify(input.config??found.rows[0].config)]);
    if(input.order!==undefined){const ids=(await c.query(`SELECT id FROM academy.exam_sections WHERE exam_version_id=$1 ORDER BY sort_order,id`,[version])).rows.map(x=>x.id);if(input.order>ids.length)throw new BadRequestException('Section order is outside the current section range');ids.splice(ids.indexOf(id),1);ids.splice(input.order-1,0,id);await this.reposition(c,version,'academy.exam_sections','exam_version_id',version,ids);}
    return{id,examVersionId:version,type:input.type??found.rows[0].section_type,order:input.order??found.rows[0].sort_order,config:input.config??found.rows[0].config};
  });}
  async deleteSection(user:CurrentUser,id:string){return this.transaction(async c=>{const row=await this.examForSection(c,id);const version=await this.draftVersion(c,user,row.exam_id);const d=await c.query(`DELETE FROM academy.exam_sections WHERE id=$1 AND exam_version_id=$2 RETURNING id`,[id,version]);if(!d.rowCount)throw missing();return{deleted:true,id};});}

  async createQuestion(user:CurrentUser,sectionId:string,input:CreateQuestionDto){return this.transaction(async c=>{
    const s=await this.examForSection(c,sectionId);const version=await this.draftVersion(c,user,s.exam_id);const section=await c.query(`SELECT id FROM academy.exam_sections WHERE id=$1 AND exam_version_id=$2`,[sectionId,version]);if(!section.rowCount)throw missing();
    const opts=(input.options??[]).map(o=>o.content);validateAnswer(input.type,opts,input.answerKey);
    const n=await c.query(`SELECT coalesce(max(sort_order),0)::int AS n FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2`,[sectionId,version]);
    const q=(await c.query(`INSERT INTO academy.exam_questions(exam_version_id,section_id,sort_order,question_type,prompt,content) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,[version,sectionId,n.rows[0].n+1,input.type,input.prompt.trim(),JSON.stringify(input.content??{})])).rows[0].id;
    for(let i=0;i<opts.length;i++)await c.query(`INSERT INTO academy.exam_question_options(question_id,exam_version_id,sort_order,content) VALUES($1,$2,$3,$4::jsonb)`,[q,version,i+1,JSON.stringify({text:opts[i]})]);
    await c.query(`INSERT INTO academy.exam_answer_keys(question_id,exam_version_id,answer_key) VALUES($1,$2,$3::jsonb)`,[q,version,JSON.stringify(input.answerKey)]);return this.question(c,user,q,version);
  });}
  private async question(c:PoolClient,user:CurrentUser,id:string,version:string){
    const r=await c.query(`SELECT q.id,q.section_id,q.sort_order AS "order",q.question_type AS type,q.prompt,q.content,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'order',o.sort_order,'content',o.content) ORDER BY o.sort_order) FROM academy.exam_question_options o WHERE o.question_id=q.id AND o.exam_version_id=q.exam_version_id),'[]'::jsonb) AS options,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'type',m.type,'mimeType',m.mime_type,'size',m.size,'durationSeconds',m.duration_seconds,'url','/media/'||m.id||'/content') ORDER BY m.created_at,m.id) FROM academy.exam_media_attachments a JOIN academy.media m ON m.id=a.media_id WHERE a.question_id=q.id AND a.exam_version_id=q.exam_version_id),'[]'::jsonb) AS media,
      (SELECT answer_key FROM academy.exam_answer_keys k WHERE k.question_id=q.id AND k.exam_version_id=q.exam_version_id) AS answer_key
      FROM academy.exam_questions q WHERE q.id=$1 AND q.exam_version_id=$2`,[id,version]);if(!r.rowCount)throw missing();const row=r.rows[0];const out={id:row.id,sectionId:row.section_id,order:row.order,type:row.type,prompt:row.prompt,content:row.content,options:row.options,media:row.media};if(!studentOnly(user))Object.assign(out,{answerKey:row.answer_key});return out;
  }
  async listQuestions(user:CurrentUser,sectionId:string,page:number,limit:number):Promise<PaginatedResult<unknown>>{
    const c=await this.db.pool.connect();try{const row=await this.examForSection(c,sectionId);const version=await this.readableVersion(user,row);if(!version)throw missing();const section=await c.query(`SELECT 1 FROM academy.exam_sections WHERE id=$1 AND exam_version_id=$2`,[sectionId,version]);if(!section.rowCount)throw missing();const count=await c.query(`SELECT count(*)::int AS total FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2`,[sectionId,version]);const rs=await c.query(`SELECT id FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2 ORDER BY sort_order,id LIMIT $3 OFFSET $4`,[sectionId,version,limit,(page-1)*limit]);const items=[];for(const q of rs.rows)items.push(await this.question(c,user,q.id,version));return paginate(items,count.rows[0].total,page,limit);}finally{c.release();}
  }
  async updateQuestion(user:CurrentUser,id:string,input:UpdateQuestionDto){return this.transaction(async c=>{
    const row=await this.examForQuestion(c,id);const version=await this.draftVersion(c,user,row.exam_id);const q=await c.query(`SELECT * FROM academy.exam_questions WHERE id=$1 AND exam_version_id=$2`,[id,version]);if(!q.rowCount)throw missing();
    const currentOpts=await c.query(`SELECT content->>'text' AS text FROM academy.exam_question_options WHERE question_id=$1 AND exam_version_id=$2 ORDER BY sort_order`,[id,version]);const options=input.options?.map(o=>o.content)??currentOpts.rows.map(x=>x.text);const oldKey=await c.query(`SELECT answer_key FROM academy.exam_answer_keys WHERE question_id=$1 AND exam_version_id=$2`,[id,version]);const key=input.answerKey??oldKey.rows[0]?.answer_key;const type=input.type??q.rows[0].question_type;validateAnswer(type,options,key);
    await c.query(`UPDATE academy.exam_questions SET question_type=$3,prompt=$4,content=$5::jsonb WHERE id=$1 AND exam_version_id=$2`,[id,version,type,input.prompt?.trim()??q.rows[0].prompt,JSON.stringify(input.content??q.rows[0].content)]);
    if(input.options){await c.query(`DELETE FROM academy.exam_question_options WHERE question_id=$1 AND exam_version_id=$2`,[id,version]);for(let i=0;i<options.length;i++)await c.query(`INSERT INTO academy.exam_question_options(question_id,exam_version_id,sort_order,content) VALUES($1,$2,$3,$4::jsonb)`,[id,version,i+1,JSON.stringify({text:options[i]})]);}
    if(input.answerKey)await c.query(`UPDATE academy.exam_answer_keys SET answer_key=$3::jsonb WHERE question_id=$1 AND exam_version_id=$2`,[id,version,JSON.stringify(key)]);return this.question(c,user,id,version);
  });}
  async deleteQuestion(user:CurrentUser,id:string){return this.transaction(async c=>{const row=await this.examForQuestion(c,id);const version=await this.draftVersion(c,user,row.exam_id);const d=await c.query(`DELETE FROM academy.exam_questions WHERE id=$1 AND exam_version_id=$2 RETURNING id`,[id,version]);if(!d.rowCount)throw missing();return{deleted:true,id};});}
  async reorderQuestions(user:CurrentUser,sectionId:string,ids:string[]){return this.transaction(async c=>{const row=await this.examForSection(c,sectionId);const version=await this.draftVersion(c,user,row.exam_id);const actual=(await c.query(`SELECT id FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2 ORDER BY sort_order,id`,[sectionId,version])).rows.map(x=>x.id);if(ids.length!==actual.length||new Set(ids).size!==ids.length||ids.some(id=>!actual.includes(id)))throw new BadRequestException('questionIds must list every question in the section exactly once');await this.reposition(c,version,'academy.exam_questions','section_id',sectionId,ids);return{sectionId,questionIds:ids};});}
}
