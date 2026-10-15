import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { mediaRoot, validBytes } from '../media/media.service';
const accepted=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','text/plain','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm','audio/aac','image/png','image/jpeg','image/webp'];
export const importErrors:Record<string,string>={INVALID_OR_UNSAFE_ZIP:'ZIP is invalid, encrypted, unsafe or exceeds expansion limits',INVALID_NORMALIZED_EXAM:'exam.json does not match Normalized Exam Schema',INVALID_ANSWER_KEY:'A question answer key is invalid',PACKAGE_EXAM_JSON_REQUIRED:'ZIP package must contain exam.json',PACKAGE_ONLY_EXAM_JSON_SUPPORTED:'MVP ZIP supports only exam.json up to 1 MiB; upload assets separately',INVALID_EXAM_JSON:'exam.json is not valid JSON',DOCX_DOCUMENT_XML_REQUIRED:'DOCX is missing word/document.xml',UNSAFE_DOCX_XML:'DOCX contains unsupported XML declarations',PDF_EXTRACTION_FAILED:'PDF text extraction failed: malformed, encrypted, too large or timed out',FILE_TOO_LARGE:'File exceeds 20 MiB',UNSUPPORTED_IMPORT_MIME:'Unsupported import MIME',IMPORT_PARSE_FAILED:'Parser failed or exceeded resource limits',IMPORT_PROCESSING_FAILED:'Import processing failed; retry by uploading a new job',WORKER_RETRY_EXHAUSTED:'Worker lease expired after three processing attempts',OWNER_INACTIVE_OR_UNAUTHORIZED:'Import owner is inactive or no longer has Teacher/Admin role'};
@Injectable()
export class ImportService {
 constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
 async upload(u:CurrentUser,file:any,requestId:string){
  if(!file?.buffer?.length)throw new BadRequestException('A file is required');const mime=String(file.mimetype).toLowerCase();
  if(!accepted.includes(mime)||(mime==='application/zip'?!(file.buffer.length>=4&&file.buffer.readUInt32LE(0)===0x04034b50):!validBytes(mime,file.buffer)))throw new UnsupportedMediaTypeException();
  const key=randomUUID(),path=join(mediaRoot,'imports',key);await mkdir(join(mediaRoot,'imports'),{recursive:true});await writeFile(path,file.buffer,{flag:'wx',mode:0o600});
  try{const r=await this.db.pool.query(`INSERT INTO academy.import_jobs(created_by,storage_key,mime_type,size,request_id) VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at AS "createdAt"`,[u.id,key,mime,file.size,requestId]);return{jobId:r.rows[0].id,status:r.rows[0].status,createdAt:r.rows[0].createdAt};}catch(e){await unlink(path).catch(()=>{});throw e;}
 }
 async get(u:CurrentUser,id:string){const row=(await this.db.pool.query(`SELECT id,status,exam_id,result,error_code,created_at,updated_at FROM academy.import_jobs WHERE id=$1 AND (created_by=$2 OR $3::boolean)`,[id,u.id,u.roles.includes('ADMIN')])).rows[0];if(!row)throw new NotFoundException();return{jobId:row.id,status:row.status,examId:row.exam_id,result:row.result,error:row.error_code?{code:row.error_code,reason:importErrors[row.error_code]??'Import failed'}:null,createdAt:row.created_at,updatedAt:row.updated_at};}
 async review(u:CurrentUser,id:string){const updated=await this.db.pool.query(`UPDATE academy.import_jobs j SET status='READY',updated_at=clock_timestamp() FROM academy.exams e WHERE j.id=$1 AND e.id=j.exam_id AND e.status='DRAFT' AND j.status IN ('NEEDS_REVIEW','READY') AND (j.created_by=$2 OR $3::boolean) RETURNING j.id`,[id,u.id,u.roles.includes('ADMIN')]);if(!updated.rowCount){await this.get(u,id);throw new ConflictException('Only a completed draft import can be reviewed');}return this.get(u,id);}
}
