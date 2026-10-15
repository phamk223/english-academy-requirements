import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { paginate } from '../../common/api/contract';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { ReportQueryDto } from './reports.dto';
export function reportWindow(q:ReportQueryDto):[Date|null,Date|null]{
 if(q.week&&q.month)throw new BadRequestException('Use week or month, not both');
 if(q.month){const [year,month]=q.month.split('-').map(Number);if(year<2000||year>9998)throw new BadRequestException('Year out of range');return[new Date(Date.UTC(year,month-1,1)),new Date(Date.UTC(year,month,1))];}
 if(q.week){const [year,w]=q.week.split('-W').map(Number);if(year<2000||year>9998)throw new BadRequestException('Year out of range');const jan4=new Date(Date.UTC(year,0,4));const start=new Date(jan4.getTime()-((jan4.getUTCDay()+6)%7)*86400000+(w-1)*604800000);const thursday=new Date(start.getTime()+3*86400000);if(thursday.getUTCFullYear()!==year)throw new BadRequestException('Invalid ISO week');return[start,new Date(start.getTime()+604800000)];}return[null,null];
}
@Injectable()
export class ReportsService {
 constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
 async report(kind:'students'|'classes'|'exams'|'listening',u:CurrentUser,q:ReportQueryDto){
  const [start,end]=reportWindow(q),v:unknown[]=[u.id,u.roles.includes('ADMIN'),q.studentId??null,q.classId??null,q.examId??null,start,end];
  if(q.classId&&!u.roles.includes('ADMIN')){const allowed=await this.db.pool.query('SELECT 1 FROM academy.teacher_class_assignments WHERE class_id=$1 AND teacher_id=$2',[q.classId,u.id]);if(!allowed.rowCount)throw new NotFoundException();}
  // EXISTS avoids multiplying an attempt when students belong to multiple classes.
  const scoped=`SELECT a.* FROM academy.exam_attempts a JOIN academy.exams e ON e.id=a.exam_id WHERE ($2::boolean OR e.created_by=$1 OR EXISTS(SELECT 1 FROM academy.class_memberships m JOIN academy.teacher_class_assignments t ON t.class_id=m.class_id WHERE m.student_id=a.student_id AND t.teacher_id=$1)) AND ($3::uuid IS NULL OR a.student_id=$3) AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM academy.class_memberships m WHERE m.student_id=a.student_id AND m.class_id=$4)) AND ($5::uuid IS NULL OR a.exam_id=$5)`;
  let sql:string;
  if(kind==='listening'){
   sql=`WITH scoped AS (${scoped}) SELECT a.student_id AS "studentId",a.exam_id AS "examId",s.section_id AS "sectionId",s.media_id AS "mediaId",count(*)::int AS "eventCount",round(sum(p.credited_ms)::numeric/1000,3)::float8 AS "actualListeningTime" FROM scoped a JOIN academy.listening_sessions s ON s.attempt_id=a.id JOIN academy.playback_events p ON p.session_id=s.id WHERE ($6::timestamptz IS NULL OR p.received_at >= $6) AND ($7::timestamptz IS NULL OR p.received_at < $7) GROUP BY a.student_id,a.exam_id,s.section_id,s.media_id`;
  }else{
   const grouping=kind==='students'?'a.student_id':kind==='exams'?'a.exam_id':'cl.id';
   const label=kind==='students'?'sp.display_name':kind==='exams'?'ev.title':'cl.class_name';
   const join=kind==='students'?'JOIN academy.student_profiles sp ON sp.user_id=a.student_id':kind==='exams'?'JOIN academy.exam_versions ev ON ev.id=a.exam_version_id':`JOIN academy.class_memberships cm ON cm.student_id=a.student_id JOIN academy.classes cl ON cl.id=cm.class_id`;
   const extra=kind==='classes'?`AND ($4::uuid IS NULL OR cl.id=$4) AND ($2::boolean OR EXISTS(SELECT 1 FROM academy.teacher_class_assignments t WHERE t.class_id=cl.id AND t.teacher_id=$1))`:'';
   sql=`WITH scoped AS (${scoped}) SELECT ${grouping} AS id,min(${label}) AS label,count(*)::int AS "attemptCount",count(*) FILTER(WHERE a.status IN ('SUBMITTED','GRADED'))::int AS "submittedCount",count(*) FILTER(WHERE a.status='GRADED')::int AS "gradedCount",count(*) FILTER(WHERE a.grading_status='NEEDS_MANUAL_GRADING')::int AS "needsManualGradingCount",coalesce(sum(a.score) FILTER(WHERE a.status='GRADED'),0)::float8 AS "totalScore",round(avg(100.0*a.score/nullif(a.max_score,0)) FILTER(WHERE a.status='GRADED'),2)::float8 AS "averagePercent" FROM scoped a ${join} WHERE ($6::timestamptz IS NULL OR a.started_at >= $6) AND ($7::timestamptz IS NULL OR a.started_at < $7) ${extra} GROUP BY ${grouping}`;
  }
  const client=await this.db.pool.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const count=await client.query(`SELECT count(*)::int AS total FROM (${sql}) report`,v);const order=kind==='listening'?`"studentId","examId","sectionId","mediaId"`:'id';const rows=await client.query(`${sql} ORDER BY ${order} LIMIT $8 OFFSET $9`,[...v,q.limit,(q.page-1)*q.limit]);await client.query('COMMIT');return paginate(rows.rows,count.rows[0].total,q.page,q.limit);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
