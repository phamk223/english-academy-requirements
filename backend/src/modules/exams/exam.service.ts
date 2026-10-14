import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { paginate, PaginatedResult } from '../../common/api/contract';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { CreateExamDto, ExamListQueryDto, UpdateExamDto } from './exam.dto';

type PgFailure=Error&{code?:string};
function conflict(error:unknown):never{if((error as PgFailure)?.code==='23505')throw new ConflictException('Resource already exists');throw error;}
type ExamRow={id:string;status:string;created_by:string;created_at:Date;updated_at:Date;published_version_id:string|null;published_version_number:number|null;published_title:string|null;published_description:string|null;published_sections:unknown;published_at:Date|null;draft_version_id:string|null;draft_version_number:number|null;draft_title:string|null;draft_description:string|null;draft_sections:unknown};
function shape(row:ExamRow,user:CurrentUser){
  const publishedVersion=row.published_version_id?{id:row.published_version_id,versionNumber:row.published_version_number,title:row.published_title,description:row.published_description,sections:row.published_sections,status:'PUBLISHED',publishedAt:row.published_at}:null;
  const isStudent=user.roles.includes('STUDENT')&&!user.roles.some(r=>r==='ADMIN'||r==='TEACHER');
  return {id:row.id,status:row.status,createdBy:row.created_by,createdAt:row.created_at,updatedAt:row.updated_at,publishedVersion,...(!isStudent?{draftVersion:row.draft_version_id?{id:row.draft_version_id,versionNumber:row.draft_version_number,title:row.draft_title,description:row.draft_description,sections:row.draft_sections,status:'DRAFT'}:null}:{})};
}
const selectSql=`SELECT e.id,e.status,e.created_by,e.created_at,e.updated_at,e.published_version_id,
  pv.version_number AS published_version_number,pv.title AS published_title,pv.description AS published_description,coalesce(ps.sections,pv.sections) AS published_sections,pv.published_at,
  dv.id AS draft_version_id,dv.version_number AS draft_version_number,dv.title AS draft_title,dv.description AS draft_description,coalesce(ds.sections,dv.sections) AS draft_sections
  FROM academy.exams e LEFT JOIN academy.exam_versions pv ON pv.id=e.published_version_id
  LEFT JOIN LATERAL (SELECT v.* FROM academy.exam_versions v WHERE v.exam_id=e.id AND v.status='DRAFT' ORDER BY v.version_number DESC LIMIT 1) dv ON true
  LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',s.id,'order',s.sort_order,'type',s.section_type,'config',s.config) ORDER BY s.sort_order,s.id) AS sections FROM academy.exam_sections s WHERE s.exam_version_id=pv.id) ps ON true
  LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',s.id,'order',s.sort_order,'type',s.section_type,'config',s.config) ORDER BY s.sort_order,s.id) AS sections FROM academy.exam_sections s WHERE s.exam_version_id=dv.id) ds ON true`;
function canManage(user:CurrentUser,owner:string){return user.roles.includes('ADMIN')||((user.roles.includes('TEACHER'))&&owner===user.id);}

@Injectable()
export class ExamService{
  constructor(@Inject(DatabaseService) private readonly database:DatabaseService){}

  async create(user:CurrentUser,input:CreateExamDto){
    const client=await this.database.pool.connect();
    try{
      await client.query('BEGIN');
      const exam=await client.query(`INSERT INTO academy.exams(status,created_by) VALUES('DRAFT',$1) RETURNING id`,[user.id]);
      const published=input.status==='PUBLISHED';
      const version=await client.query(`INSERT INTO academy.exam_versions(exam_id,version_number,title,description,sections,status,created_by,published_by,published_at)
        VALUES($1,1,$2,$3,$4::jsonb,$5,$6,$7,CASE WHEN $5='PUBLISHED' THEN now() END) RETURNING id`,
        [exam.rows[0].id,input.title.trim(),input.description?.trim()??null,JSON.stringify(input.sections??[]),published?'PUBLISHED':'DRAFT',user.id,published?user.id:null]);
      if(published)await client.query(`UPDATE academy.exams SET status='PUBLISHED',published_version_id=$2 WHERE id=$1`,[exam.rows[0].id,version.rows[0].id]);
      await client.query('COMMIT');
      return this.get(user,exam.rows[0].id);
    }catch(error){await client.query('ROLLBACK');return conflict(error);}finally{client.release();}
  }

  async list(user:CurrentUser,query:ExamListQueryDto):Promise<PaginatedResult<unknown>>{
    const isStudent=user.roles.includes('STUDENT')&&!user.roles.some(r=>r==='ADMIN'||r==='TEACHER');
    const where:string[]=[];const values:unknown[]=[];
    if(isStudent){where.push("e.status='PUBLISHED'");}
    else if(!user.roles.includes('ADMIN')){values.push(user.id);where.push(`e.created_by=$${values.length}`);}
    if(query.status){values.push(query.status);where.push(`e.status=$${values.length}`);}
    if(query.q){values.push(query.q.trim().toLocaleLowerCase());const n=values.length;where.push(`position($${n} in lower(coalesce(dv.title,pv.title,'')))>0`);}
    const filter=where.length?`WHERE ${where.join(' AND ')}`:'';
    const count=await this.database.pool.query(`SELECT count(*)::int AS total FROM academy.exams e LEFT JOIN academy.exam_versions pv ON pv.id=e.published_version_id LEFT JOIN LATERAL(SELECT title FROM academy.exam_versions WHERE exam_id=e.id AND status='DRAFT' ORDER BY version_number DESC LIMIT 1) dv ON true ${filter}`,values);
    const offset=(query.page-1)*query.limit;
    const rows=await this.database.pool.query(`${selectSql} ${filter} ORDER BY e.updated_at DESC,e.id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,query.limit,offset]);
    return paginate(rows.rows.map((row:ExamRow)=>shape(row,user)),count.rows[0].total,query.page,query.limit);
  }

  async get(user:CurrentUser,id:string){
    const result=await this.database.pool.query(`${selectSql} WHERE e.id=$1`,[id]);
    const row=result.rows[0] as ExamRow|undefined;
    if(!row)throw new NotFoundException('Resource not found');
    const isStudent=user.roles.includes('STUDENT')&&!user.roles.some(r=>r==='ADMIN'||r==='TEACHER');
    if(isStudent){if(row.status!=='PUBLISHED')throw new NotFoundException('Resource not found');}
    else if(!canManage(user,row.created_by))throw new NotFoundException('Resource not found');
    return shape(row,user);
  }

  async update(user:CurrentUser,id:string,input:UpdateExamDto){
    const client=await this.database.pool.connect();
    try{
      await client.query('BEGIN');
      const exam=await client.query(`SELECT * FROM academy.exams WHERE id=$1 FOR UPDATE`,[id]);
      if(!exam.rowCount)throw new NotFoundException('Resource not found');
      const current=exam.rows[0];
      if(!canManage(user,current.created_by))throw new NotFoundException('Resource not found');
      if(current.status==='ARCHIVED')throw new ConflictException('Archived exams cannot be changed');
      let draft=await client.query(`SELECT * FROM academy.exam_versions WHERE exam_id=$1 AND status='DRAFT'`,[id]);
      const hasContent=input.title!==undefined||input.description!==undefined||input.sections!==undefined;
      if(!draft.rowCount&&hasContent){
        const latest=await client.query(`SELECT max(version_number)::int AS n FROM academy.exam_versions WHERE exam_id=$1`,[id]);
        const published=await client.query(`SELECT * FROM academy.exam_versions WHERE id=$1`,[current.published_version_id]);
        if(!published.rowCount)throw new ConflictException('No published version is available');
        const source=published.rows[0];
        draft=await client.query(`INSERT INTO academy.exam_versions(exam_id,version_number,title,description,sections,status,created_by)
          VALUES($1,$2,$3,$4,$5,'DRAFT',$6) RETURNING *`,[id,latest.rows[0].n+1,source.title,source.description,source.sections,user.id]);
      }
      if(draft.rowCount&&hasContent){
        const d=draft.rows[0];
        await client.query(`UPDATE academy.exam_versions SET title=$2,description=$3,sections=$4::jsonb WHERE id=$1`,
          [d.id,input.title?.trim()??d.title,input.description===undefined?d.description:input.description?.trim()??null,JSON.stringify(input.sections??d.sections)]);
      }
      if(input.status==='PUBLISHED'){
        if(!draft.rowCount)throw new ConflictException('There is no draft version to publish');
        const draftId=draft.rows[0].id;
        await client.query(`UPDATE academy.exam_versions SET status='PUBLISHED',published_by=$2,published_at=now() WHERE id=$1`,[draftId,user.id]);
        await client.query(`UPDATE academy.exams SET status='PUBLISHED',published_version_id=$2,archived_at=NULL WHERE id=$1`,[id,draftId]);
      }else if(input.status==='DRAFT'){
        if(current.status==='PUBLISHED')throw new ConflictException('A published exam stays visible until archived');
        await client.query(`UPDATE academy.exams SET status='DRAFT' WHERE id=$1`,[id]);
      }
      await client.query('COMMIT');
      return this.get(user,id);
    }catch(error){await client.query('ROLLBACK');return conflict(error);}finally{client.release();}
  }

  async archive(user:CurrentUser,id:string){
    const result=await this.database.pool.query(`UPDATE academy.exams e SET status='ARCHIVED',archived_at=COALESCE(e.archived_at,now()) WHERE e.id=$1 AND (e.created_by=$2 OR $3::boolean) RETURNING e.id`,[id,user.id,user.roles.includes('ADMIN')]);
    if(!result.rowCount)throw new NotFoundException('Resource not found');
    return this.getArchived(user,id);
  }
  private async getArchived(user:CurrentUser,id:string){const result=await this.database.pool.query(`${selectSql} WHERE e.id=$1`,[id]);if(!result.rowCount)throw new NotFoundException('Resource not found');return shape(result.rows[0],user);}
}
