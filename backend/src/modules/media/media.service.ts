import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { AttachMediaDto } from './media.dto';

const MAX_SIZE = 20 * 1024 * 1024;
const MIME_TYPE: Record<string, 'AUDIO' | 'IMAGE' | 'DOCUMENT'> = {
  'audio/mpeg':'AUDIO','audio/wav':'AUDIO','audio/x-wav':'AUDIO','audio/ogg':'AUDIO','audio/mp4':'AUDIO','audio/webm':'AUDIO','audio/aac':'AUDIO',
  'image/png':'IMAGE','image/jpeg':'IMAGE','image/webp':'IMAGE',
  'application/pdf':'DOCUMENT','text/plain':'DOCUMENT','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'DOCUMENT',
};
export const mediaRoot = process.env.MEDIA_STORAGE_PATH ?? join(process.cwd(), 'var', 'media');
const root=mediaRoot;
type Target = { sectionId?: string; questionId?: string };

export function validBytes(mime: string, b: Buffer): boolean {
  if (mime === 'image/png') return b.length >= 8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return b.length >= 3 && b[0]===255 && b[1]===216 && b[2]===255;
  if (mime === 'image/webp') return b.length >= 12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP';
  if (mime === 'application/pdf') return b.subarray(0,5).toString('ascii')==='%PDF-';
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WAVE';
  if (mime === 'audio/ogg') return b.subarray(0,4).toString('ascii')==='OggS';
  if (mime === 'audio/mpeg') return b.length>=3 && (b.subarray(0,3).toString('ascii')==='ID3' || (b[0]===255&&(b[1]&224)===224));
  if (mime === 'audio/mp4') return b.length>=8 && b.toString('ascii',4,8)==='ftyp';
  if (mime === 'audio/webm') return b.length>=4 && b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if (mime === 'audio/aac') return b.length>=2 && b[0]===255 && (b[1]&246)===240;
  if (mime === 'text/plain') return !b.includes(0) && Buffer.from(b.toString('utf8')).equals(b);
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return b.length>=4 && b[0]===0x50 && b[1]===0x4b && b[2]===3 && b[3]===4 && b.includes(Buffer.from('[Content_Types].xml')) && b.includes(Buffer.from('word/'));
  return false;
}

@Injectable()
export class MediaService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  private async transaction<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{const c=await this.db.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');if((e as any)?.code==='23505')throw new ConflictException('Resource already exists');throw e;}finally{c.release();}}

  async upload(user:CurrentUser,file:any,target:Target,durationSeconds?:number){
    if(!file?.buffer?.length)throw new BadRequestException('A file is required');
    if(file.size>MAX_SIZE)throw new PayloadTooLargeException();
    const mime=String(file.mimetype??'').toLowerCase();const type=MIME_TYPE[mime];
    if(!type||!validBytes(mime,file.buffer))throw new UnsupportedMediaTypeException('File type is not allowed or does not match its content');
    if((target.sectionId?1:0)+(target.questionId?1:0)>1)throw new BadRequestException('Choose either sectionId or questionId');
    const duration=durationSeconds===undefined||durationSeconds===null?null:Number(durationSeconds);
    if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>86400))throw new BadRequestException('durationSeconds must be an integer from 1 to 86400');
    if(type!=='AUDIO'&&duration!==null)throw new BadRequestException('durationSeconds is only valid for audio');
    const id=randomUUID(), key=randomUUID();const dir=join(root,'objects');await mkdir(dir,{recursive:true});const finalPath=join(dir,key);const temp=join(dir,`.${key}.tmp`);
    await writeFile(temp,file.buffer,{flag:'wx',mode:0o600});
    try{await rename(temp,finalPath);const media=await this.transaction(async c=>{
      const inserted=await c.query(`INSERT INTO academy.media(id,type,storage_key,mime_type,size,duration_seconds,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,type,mime_type,size,duration_seconds AS "durationSeconds",created_at AS "createdAt",created_by AS "createdBy"`,[id,type,key,mime,file.size,duration,user.id]);
      if(target.sectionId||target.questionId)await this.attach(c,user,id,target);
      return {...inserted.rows[0],size:Number(inserted.rows[0].size),url:`/media/${id}/content`};
    });return media;}catch(error){await unlink(temp).catch(()=>{});await unlink(finalPath).catch(()=>{});throw error;}
  }

  async attachExisting(user:CurrentUser,id:string,target:AttachMediaDto){return this.transaction(async c=>{const media=await c.query('SELECT id FROM academy.media WHERE id=$1 AND (created_by=$2 OR $3::boolean)',[id,user.id,user.roles.includes('ADMIN')]);if(!media.rowCount)throw new NotFoundException('Resource not found');await this.attach(c,user,id,target);return {mediaId:id,...target};});}

  private async attach(c:PoolClient,user:CurrentUser,mediaId:string,target:Target){
    if(Boolean(target.sectionId)===Boolean(target.questionId))throw new BadRequestException('Exactly one of sectionId or questionId is required');
    const table=target.sectionId?'exam_sections':'exam_questions';const col=target.sectionId?'section_id':'question_id';const id=target.sectionId??target.questionId;
    const found=await c.query(`SELECT e.id AS exam_id,e.created_by,e.status,v.id AS version_id,v.status AS version_status FROM academy.${table} x JOIN academy.exam_versions v ON v.id=x.exam_version_id JOIN academy.exams e ON e.id=v.exam_id WHERE x.id=$1 ORDER BY (v.status='DRAFT') DESC LIMIT 1 FOR UPDATE OF e`,[id]);
    if(!found.rowCount)throw new NotFoundException('Target not found');const row=found.rows[0];if(!(user.roles.includes('ADMIN')||(user.roles.includes('TEACHER')&&row.created_by===user.id)))throw new NotFoundException('Resource not found');
    if(row.status==='ARCHIVED')throw new ConflictException('Archived exams cannot be changed');
    let version=row.version_id;
    if(row.version_status!=='DRAFT'){
      const current=await c.query(`SELECT id FROM academy.exam_versions WHERE exam_id=$1 AND status='DRAFT'`,[row.exam_id]);
      if(current.rowCount)version=current.rows[0].id;else{
        if(row.version_id!== (await c.query('SELECT published_version_id FROM academy.exams WHERE id=$1',[row.exam_id])).rows[0].published_version_id)throw new ConflictException('Exam has no editable version');
        const n=await c.query('SELECT max(version_number)::int AS n FROM academy.exam_versions WHERE exam_id=$1',[row.exam_id]);
        version=(await c.query(`INSERT INTO academy.exam_versions(exam_id,version_number,title,description,sections,status,created_by) SELECT exam_id,$2,title,description,sections,'DRAFT',$3 FROM academy.exam_versions WHERE id=$1 RETURNING id`,[row.version_id,n.rows[0].n+1,user.id])).rows[0].id;
        await c.query(`INSERT INTO academy.exam_sections(id,exam_version_id,sort_order,section_type,config,created_at) SELECT id,$2,sort_order,section_type,config,created_at FROM academy.exam_sections WHERE exam_version_id=$1`,[row.version_id,version]);
        await c.query(`INSERT INTO academy.exam_questions(id,exam_version_id,section_id,sort_order,question_type,prompt,content,created_at) SELECT id,$2,section_id,sort_order,question_type,prompt,content,created_at FROM academy.exam_questions WHERE exam_version_id=$1`,[row.version_id,version]);
        await c.query(`INSERT INTO academy.exam_question_options(id,question_id,exam_version_id,sort_order,content) SELECT id,question_id,$2,sort_order,content FROM academy.exam_question_options WHERE exam_version_id=$1`,[row.version_id,version]);
        await c.query(`INSERT INTO academy.exam_answer_keys(question_id,exam_version_id,answer_key,created_at) SELECT question_id,$2,answer_key,created_at FROM academy.exam_answer_keys WHERE exam_version_id=$1`,[row.version_id,version]);
        await c.query(`INSERT INTO academy.exam_media_attachments(media_id,exam_version_id,section_id,question_id,created_at) SELECT media_id,$2,section_id,question_id,created_at FROM academy.exam_media_attachments WHERE exam_version_id=$1`,[row.version_id,version]);
      }
    }
    const targetExists=await c.query(`SELECT 1 FROM academy.${table} WHERE id=$1 AND exam_version_id=$2`,[id,version]);if(!targetExists.rowCount)throw new NotFoundException('Target not found in the editable version');
    await c.query(`INSERT INTO academy.exam_media_attachments(media_id,exam_version_id,${col}) VALUES($1,$2,$3)`,[mediaId,version,id]);
  }

  async remove(user:CurrentUser,id:string){let original='',quarantine='';try{const result=await this.transaction(async c=>{const r=await c.query('SELECT * FROM academy.media WHERE id=$1 FOR UPDATE',[id]);if(!r.rowCount)throw new NotFoundException('Resource not found');const row=r.rows[0];if(!user.roles.includes('ADMIN')&&row.created_by!==user.id)throw new NotFoundException('Resource not found');const refs=await c.query('SELECT 1 FROM academy.exam_media_attachments WHERE media_id=$1 LIMIT 1',[id]);if(refs.rowCount)throw new ConflictException('Media is attached to an exam version');original=join(root,'objects',row.storage_key);quarantine=join(root,'.staging',`delete-${id}`);await mkdir(join(root,'.staging'),{recursive:true});await rename(original,quarantine).catch((e:any)=>{if(e?.code!=='ENOENT')throw e;});await c.query('DELETE FROM academy.media WHERE id=$1',[id]);return {deleted:true,id};});await unlink(quarantine).catch(()=>{});return result;}catch(error){if(original&&quarantine)await rename(quarantine,original).catch(()=>{});throw error;}}

  async content(user:CurrentUser,id:string){
    const result=await this.db.pool.query(`SELECT m.*,EXISTS(SELECT 1 FROM academy.exam_media_attachments a JOIN academy.exam_versions v ON v.id=a.exam_version_id JOIN academy.exams e ON e.published_version_id=v.id AND e.status='PUBLISHED' JOIN academy.exam_assignments asg ON asg.exam_id=e.id AND asg.status='ACTIVE' LEFT JOIN academy.class_memberships cm ON cm.class_id=asg.class_id AND cm.student_id=$2 LEFT JOIN academy.classes cl ON cl.id=cm.class_id WHERE a.media_id=m.id AND (asg.student_id=$2 OR (cm.student_id=$2 AND cl.status='ACTIVE'))) AS assigned FROM academy.media m WHERE m.id=$1`,[id,user.id]);
    if(!result.rowCount)throw new NotFoundException('Resource not found');const row=result.rows[0];
    if(user.roles.includes('STUDENT')&&!user.roles.includes('ADMIN')&&!user.roles.includes('TEACHER')){if(!row.assigned){const historical=await this.db.pool.query(`SELECT 1 FROM academy.exam_media_attachments ma JOIN academy.exam_attempts a ON a.exam_version_id=ma.exam_version_id WHERE ma.media_id=$1 AND a.student_id=$2 LIMIT 1`,[id,user.id]);if(!historical.rowCount)throw new NotFoundException('Resource not found');}}
    else if(user.roles.includes('TEACHER')&&!user.roles.includes('ADMIN')){const ok=await this.db.pool.query(`SELECT 1 FROM academy.media m WHERE m.id=$1 AND m.created_by=$2 UNION ALL SELECT 1 FROM academy.exam_media_attachments a JOIN academy.exam_versions v ON v.id=a.exam_version_id JOIN academy.exams e ON e.id=v.exam_id WHERE a.media_id=$1 AND e.created_by=$2 LIMIT 1`,[id,user.id]);if(!ok.rowCount)throw new NotFoundException('Resource not found');}
    const path=join(root,'objects',row.storage_key);try{return{stream:await readFile(path),mimeType:row.mime_type,size:Number(row.size),name:row.type==='DOCUMENT'?'media':'media',type:row.type};}catch{throw new NotFoundException('Media object not found');}
  }
}
