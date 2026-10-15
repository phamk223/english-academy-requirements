import 'reflect-metadata';
import 'dotenv/config';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { databaseConfig } from '../../config/environment';
import { mediaRoot } from '../media/media.service';
const execute=promisify(execFile);
export async function runImportOnce(pool:Pool){
 await pool.query(`UPDATE academy.import_jobs SET status='FAILED',error_code='WORKER_RETRY_EXHAUSTED',lease_until=NULL,updated_at=clock_timestamp() WHERE status='PROCESSING' AND lease_until<now() AND processing_attempts>=3`);
 const token=randomUUID();const job=(await pool.query(`UPDATE academy.import_jobs j SET status='PROCESSING',lease_token=$1,lease_until=clock_timestamp()+interval '120 seconds',processing_attempts=processing_attempts+1,updated_at=clock_timestamp() WHERE id=(SELECT id FROM academy.import_jobs WHERE status='UPLOADED' OR (status='PROCESSING' AND lease_until<now() AND processing_attempts<3) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,[token])).rows[0];if(!job)return false;
 let mediaPath:string|undefined;const c=await pool.connect();
 try{
  let parsed:any;try{const {stdout}=await execute(process.execPath,['--max-old-space-size=256',join(__dirname,'import-parser.js'),join(mediaRoot,'imports',job.storage_key),job.mime_type],{timeout:30000,maxBuffer:2097152,env:{PATH:process.env.PATH}});parsed=JSON.parse(stdout);}catch{throw new Error('IMPORT_PARSE_FAILED');}if(parsed.error)throw new Error(parsed.error);
  let mediaKey:string|undefined;if(parsed.sourceMedia){mediaKey=randomUUID();await mkdir(join(mediaRoot,'objects'),{recursive:true});mediaPath=join(mediaRoot,'objects',mediaKey);await copyFile(join(mediaRoot,'imports',job.storage_key),mediaPath);}
  await c.query('BEGIN');const owned=await c.query(`SELECT id FROM academy.import_jobs WHERE id=$1 AND lease_token=$2 AND status='PROCESSING' FOR UPDATE`,[job.id,token]);if(!owned.rowCount)throw new Error('IMPORT_PROCESSING_FAILED');
  const active=await c.query(`SELECT 1 FROM academy.users u JOIN academy.user_roles ur ON ur.user_id=u.id JOIN academy.roles r ON r.id=ur.role_id WHERE u.id=$1 AND u.status='ACTIVE' AND r.code IN ('ADMIN','TEACHER') LIMIT 1`,[job.created_by]);if(!active.rowCount)throw new Error('OWNER_INACTIVE_OR_UNAUTHORIZED');
  const exam=parsed.exam;const examId=(await c.query(`INSERT INTO academy.exams(created_by) VALUES($1) RETURNING id`,[job.created_by])).rows[0].id;
  const version=(await c.query(`INSERT INTO academy.exam_versions(exam_id,version_number,title,description,created_by) VALUES($1,1,$2,$3,$4) RETURNING id`,[examId,exam.title,exam.description??null,job.created_by])).rows[0].id;
  let questionCount=0;
  for(let i=0;i<exam.sections.length;i++){
   const section=exam.sections[i];const sid=(await c.query(`INSERT INTO academy.exam_sections(exam_version_id,sort_order,section_type,config) VALUES($1,$2,$3,$4::jsonb) RETURNING id`,[version,i+1,section.type,JSON.stringify(section.config??{})])).rows[0].id;
   if(mediaKey&&i===0){const mid=(await c.query(`INSERT INTO academy.media(type,storage_key,mime_type,size,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id`,[job.mime_type.startsWith('audio/')?'AUDIO':'IMAGE',mediaKey,job.mime_type,job.size,job.created_by])).rows[0].id;await c.query('INSERT INTO academy.exam_media_attachments(media_id,exam_version_id,section_id) VALUES($1,$2,$3)',[mid,version,sid]);}
   for(let n=0;n<section.questions.length;n++){
    const q=section.questions[n];questionCount++;const qid=(await c.query(`INSERT INTO academy.exam_questions(exam_version_id,section_id,sort_order,question_type,prompt,content) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,[version,sid,n+1,q.type,q.prompt.trim(),JSON.stringify(q.content??{})])).rows[0].id;
    for(let oi=0;oi<(q.options??[]).length;oi++)await c.query(`INSERT INTO academy.exam_question_options(question_id,exam_version_id,sort_order,content) VALUES($1,$2,$3,$4::jsonb)`,[qid,version,oi+1,JSON.stringify({text:q.options[oi].content})]);
    await c.query('INSERT INTO academy.exam_answer_keys(question_id,exam_version_id,answer_key) VALUES($1,$2,$3::jsonb)',[qid,version,JSON.stringify(q.answerKey)]);
   }
  }
  const result={examId,title:exam.title,sectionCount:exam.sections.length,questionCount,warnings:parsed.warnings};
  await c.query(`UPDATE academy.import_jobs SET status='NEEDS_REVIEW',exam_id=$3,result=$4::jsonb,error_code=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1 AND lease_token=$2`,[job.id,token,examId,JSON.stringify(result)]);await c.query('COMMIT');
  console.log(JSON.stringify({event:'import_completed',jobId:job.id,requestId:job.request_id,examId}));
 }catch(e){await c.query('ROLLBACK').catch(()=>{});if(mediaPath)await unlink(mediaPath).catch(()=>{});const code=(e as Error).message;const safe=/^(INVALID_|PACKAGE_|DOCX_|UNSAFE_|PDF_|FILE_|UNSUPPORTED_|IMPORT_|OWNER_)[A-Z_]+$/.test(code)?code:'IMPORT_PROCESSING_FAILED';await pool.query(`UPDATE academy.import_jobs SET status='FAILED',error_code=$3,lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1 AND lease_token=$2 AND status='PROCESSING'`,[job.id,token,safe]);console.error(JSON.stringify({event:'import_failed',jobId:job.id,requestId:job.request_id,code:safe}));}finally{c.release();}return true;
}
if(require.main===module){const pool=new Pool(databaseConfig());let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});(async()=>{while(!stopping){try{const worked=await runImportOnce(pool);await writeFile('/tmp/import-worker-heartbeat',String(Date.now()));if(worked)continue;}catch{console.error(JSON.stringify({event:'import_worker_error'}));}await new Promise(r=>setTimeout(r,1000));}await pool.end();})().catch(()=>{process.exitCode=1;});}
