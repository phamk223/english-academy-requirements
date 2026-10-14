import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { SaveAttemptAnswersDto } from './attempt.dto';
import { ScoringService } from './scoring.service';

@Injectable()
export class AttemptService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService,@Inject(ScoringService) private readonly scoring:ScoringService){}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.db.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  private async row(c:PoolClient,user:CurrentUser,id:string,write=false){
    const result=await c.query(`SELECT a.*,e.created_by FROM academy.exam_attempts a JOIN academy.exams e ON e.id=a.exam_id WHERE a.id=$1${write?' FOR UPDATE OF a':' FOR SHARE OF a'}`,[id]);
    const a=result.rows[0];
    const allowed=a&&(write?a.student_id===user.id:a.student_id===user.id||user.roles.includes('ADMIN')||(user.roles.includes('TEACHER')&&a.created_by===user.id));
    if(!allowed)throw new NotFoundException('Resource not found');return a;
  }
  private async questions(c:PoolClient,versionId:string){return(await c.query(`SELECT q.*,s.section_type,k.answer_key,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'order',o.sort_order,'content',o.content) ORDER BY o.sort_order,o.id) FROM academy.exam_question_options o WHERE o.question_id=q.id AND o.exam_version_id=q.exam_version_id),'[]'::jsonb) AS options,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'type',m.type,'url','/media/'||m.id||'/content') ORDER BY m.id) FROM academy.exam_media_attachments ma JOIN academy.media m ON m.id=ma.media_id WHERE ma.question_id=q.id AND ma.exam_version_id=q.exam_version_id),'[]'::jsonb) AS media
    FROM academy.exam_questions q JOIN academy.exam_sections s ON s.id=q.section_id AND s.exam_version_id=q.exam_version_id LEFT JOIN academy.exam_answer_keys k ON k.question_id=q.id AND k.exam_version_id=q.exam_version_id WHERE q.exam_version_id=$1 ORDER BY s.sort_order,q.sort_order,q.id`,[versionId])).rows;}
  private async shape(c:PoolClient,a:any){
    const version=(await c.query('SELECT id,version_number,title,description FROM academy.exam_versions WHERE id=$1',[a.exam_version_id])).rows[0];
    const sections=(await c.query(`SELECT s.id,s.section_type AS type,s.sort_order AS "order",s.config,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'type',m.type,'url','/media/'||m.id||'/content') ORDER BY m.id) FROM academy.exam_media_attachments ma JOIN academy.media m ON m.id=ma.media_id WHERE ma.section_id=s.id AND ma.exam_version_id=s.exam_version_id),'[]'::jsonb) AS media FROM academy.exam_sections s WHERE s.exam_version_id=$1 ORDER BY s.sort_order,s.id`,[a.exam_version_id])).rows;
    const questions=await this.questions(c,a.exam_version_id);
    const answers=(await c.query(`SELECT question_id AS "questionId",answer,score,max_score AS "maxScore",grading_status AS "gradingStatus",updated_at AS "updatedAt" FROM academy.attempt_answers WHERE attempt_id=$1 ORDER BY question_id`,[a.id])).rows;
    return{id:a.id,examId:a.exam_id,examVersionId:a.exam_version_id,studentId:a.student_id,status:a.status,startedAt:a.started_at,submittedAt:a.submitted_at,gradedAt:a.graded_at,score:a.score,maxScore:a.max_score,gradingStatus:a.grading_status,exam:{id:version.id,versionNumber:version.version_number,title:version.title,description:version.description,sections:sections.map(s=>({...s,questions:questions.filter(q=>q.section_id===s.id).map(q=>({id:q.id,type:q.question_type,order:q.sort_order,prompt:q.prompt,content:q.content,options:q.options,media:q.media}))}))},answers};
  }
  async start(user:CurrentUser,examId:string){return this.transaction(async c=>{
    // Serialize starts for this student and exam publication to pin one coherent snapshot.
    await c.query('SELECT id FROM academy.users WHERE id=$1 FOR UPDATE',[user.id]);
    const e=(await c.query(`SELECT id,status,published_version_id FROM academy.exams WHERE id=$1 FOR SHARE`,[examId])).rows[0];
    if(!e||e.status!=='PUBLISHED')throw new NotFoundException('Resource not found');
    const open=await c.query(`SELECT * FROM academy.exam_attempts WHERE student_id=$1 AND exam_id=$2 AND status IN ('NOT_STARTED','IN_PROGRESS') ORDER BY created_at,id LIMIT 1 FOR UPDATE`,[user.id,examId]);
    if(open.rowCount){if(open.rows[0].status==='NOT_STARTED'){await c.query(`UPDATE academy.exam_attempts SET status='IN_PROGRESS' WHERE id=$1`,[open.rows[0].id]);open.rows[0].status='IN_PROGRESS';}return this.shape(c,open.rows[0]);}
    const assigned=await c.query(`SELECT 1 FROM academy.exam_assignments a LEFT JOIN academy.class_memberships m ON m.class_id=a.class_id AND m.student_id=$2 LEFT JOIN academy.classes cl ON cl.id=m.class_id WHERE a.exam_id=$1 AND a.status='ACTIVE' AND (a.due_at IS NULL OR a.due_at>now()) AND (a.student_id=$2 OR (m.student_id=$2 AND cl.status='ACTIVE')) LIMIT 1`,[examId,user.id]);
    if(!assigned.rowCount)throw new NotFoundException('Resource not found');
    const a=(await c.query(`INSERT INTO academy.exam_attempts(exam_id,exam_version_id,student_id,status) VALUES($1,$2,$3,'IN_PROGRESS') RETURNING *`,[examId,e.published_version_id,user.id])).rows[0];return this.shape(c,a);
  });}
  async get(user:CurrentUser,id:string){return this.transaction(async c=>this.shape(c,await this.row(c,user,id)));}
  async save(user:CurrentUser,id:string,input:SaveAttemptAnswersDto){return this.transaction(async c=>{
    const a=await this.row(c,user,id,true);if(a.status!=='IN_PROGRESS')throw new ConflictException('Submitted attempts cannot be edited');
    const ids=input.answers.map(x=>x.questionId);if(new Set(ids).size!==ids.length)throw new BadRequestException('Duplicate questionId');
    const questions=await this.questions(c,a.exam_version_id);
    for(const [index,item] of input.answers.entries()){const q=questions.find(q=>q.id===item.questionId);if(!q)throw new BadRequestException('Question is not in the attempt exam version');this.scoring.validate(q.question_type,item.answer,q.options.map((o:any)=>o.id),`answers.${index}.answer`);
      await c.query(`INSERT INTO academy.attempt_answers(attempt_id,exam_version_id,question_id,answer) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer,updated_at=clock_timestamp()`,[id,a.exam_version_id,item.questionId,JSON.stringify(item.answer)]);
    }
    return this.shape(c,a);
  });}
  async submit(user:CurrentUser,id:string){return this.transaction(async c=>{
    const a=await this.row(c,user,id,true);if(['SUBMITTED','GRADED'].includes(a.status))return this.shape(c,a);
    if(a.status!=='IN_PROGRESS')throw new ConflictException('Attempt has not started');
    const questions=await this.questions(c,a.exam_version_id);const saved=(await c.query('SELECT question_id,answer FROM academy.attempt_answers WHERE attempt_id=$1',[id])).rows;let score=0,maxScore=0,manual=false;
    for(const q of questions){const answer=saved.find(x=>x.question_id===q.id)?.answer??{};const result=this.scoring.grade(q.question_type,q.section_type,answer,q.answer_key,q.options.map((o:any)=>o.id));score+=result.score;maxScore+=result.maxScore;manual ||= result.gradingStatus==='NEEDS_MANUAL_GRADING';
      await c.query(`INSERT INTO academy.attempt_answers(attempt_id,exam_version_id,question_id,answer,score,max_score,grading_status) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7) ON CONFLICT(attempt_id,question_id) DO UPDATE SET score=excluded.score,max_score=excluded.max_score,grading_status=excluded.grading_status`,[id,a.exam_version_id,q.id,JSON.stringify(answer),result.score,result.maxScore,result.gradingStatus]);
    }
    const graded=(await c.query(`UPDATE academy.exam_attempts SET status=$2,submitted_at=clock_timestamp(),score=$3,max_score=$4,grading_status=$5,graded_at=CASE WHEN $6 THEN NULL ELSE clock_timestamp() END WHERE id=$1 RETURNING *`,[id,manual?'SUBMITTED':'GRADED',score,maxScore,manual?'NEEDS_MANUAL_GRADING':'GRADED',manual])).rows[0];return this.shape(c,graded);
  });}
}
