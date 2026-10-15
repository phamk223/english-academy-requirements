import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { CreateListeningSessionDto, PlaybackEventDto } from './listening.dto';

export function listeningCredit(session:any,event:PlaybackEventDto,received:Date){
 if(!session.playing||!session.last_received_at||event.type==='SEEK')return 0;
 return Math.max(0,Math.floor(Math.min(15000,received.getTime()-new Date(session.last_received_at).getTime(),new Date(event.clientTimestamp).getTime()-new Date(session.last_client_timestamp).getTime(),(event.position-session.last_position)*1000)));
}
function shape(s:any){return{id:s.id,attemptId:s.attempt_id,sectionId:s.section_id,mediaId:s.media_id,startedAt:s.started_at,endedAt:s.ended_at,actualListeningTime:Number(s.actual_listening_ms)/1000,unit:'seconds'};}
@Injectable()
export class ListeningService {
 constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
 private async tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await this.db.pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async start(user:CurrentUser,input:CreateListeningSessionDto){return this.tx(async c=>{
  const a=(await c.query(`SELECT * FROM academy.exam_attempts WHERE id=$1 AND student_id=$2 FOR UPDATE`,[input.attemptId,user.id])).rows[0];if(!a)throw new NotFoundException();if(a.status!=='IN_PROGRESS')throw new ConflictException();
  const media=await c.query(`SELECT m.id FROM academy.media m JOIN academy.exam_media_attachments ma ON ma.media_id=m.id JOIN academy.exam_sections s ON s.id=$2 AND s.exam_version_id=ma.exam_version_id LEFT JOIN academy.exam_questions q ON q.id=ma.question_id AND q.exam_version_id=ma.exam_version_id WHERE m.id=$1 AND m.type='AUDIO' AND s.section_type='LISTENING' AND ma.exam_version_id=$3 AND (ma.section_id=s.id OR q.section_id=s.id)`,[input.mediaId,input.sectionId,a.exam_version_id]);if(!media.rowCount)throw new BadRequestException('Audio must be attached to this listening section in the attempt version');
  const open=(await c.query('SELECT * FROM academy.listening_sessions WHERE attempt_id=$1 AND ended_at IS NULL',[a.id])).rows[0];if(open){if(open.section_id===input.sectionId&&open.media_id===input.mediaId)return shape(open);throw new ConflictException('End the current listening session first');}
  return shape((await c.query(`INSERT INTO academy.listening_sessions(attempt_id,exam_version_id,section_id,media_id,student_id) VALUES($1,$2,$3,$4,$5) RETURNING *`,[a.id,a.exam_version_id,input.sectionId,input.mediaId,user.id])).rows[0]);
 });}
 async event(user:CurrentUser,id:string,input:PlaybackEventDto,end=false){if(end&&input.type!=='END')throw new BadRequestException('End requires an END event');return this.tx(async c=>{
  const ref=(await c.query('SELECT attempt_id FROM academy.listening_sessions WHERE id=$1 AND student_id=$2',[id,user.id])).rows[0];if(!ref)throw new NotFoundException();
  const a=(await c.query('SELECT status FROM academy.exam_attempts WHERE id=$1 FOR UPDATE',[ref.attempt_id])).rows[0];
  const s=(await c.query('SELECT * FROM academy.listening_sessions WHERE id=$1 FOR UPDATE',[id])).rows[0];
  const prior=(await c.query('SELECT * FROM academy.playback_events WHERE session_id=$1 AND event_id=$2',[id,input.eventId])).rows[0];if(prior){if(prior.type!==input.type||prior.position!==input.position||new Date(prior.client_timestamp).getTime()!==new Date(input.clientTimestamp).getTime())throw new ConflictException('eventId has already been used for another payload');return shape(s);}
  if(a.status!=='IN_PROGRESS'||s.ended_at)throw new ConflictException('Listening session is closed');
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;const client=new Date(input.clientTimestamp);
  if(!Number.isFinite(client.getTime())||client.getTime()>now.getTime()+5000||client.getTime()<new Date(s.started_at).getTime()-5000||(s.last_client_timestamp&&client<new Date(s.last_client_timestamp)))throw new BadRequestException('clientTimestamp is outside the session or out of order');
  const m=(await c.query('SELECT duration_seconds FROM academy.media WHERE id=$1',[s.media_id])).rows[0];if(m.duration_seconds&&input.position>m.duration_seconds)throw new BadRequestException('Position exceeds media duration');
  const credit=listeningCredit(s,input,now);
  await c.query(`INSERT INTO academy.playback_events(session_id,event_id,type,position,client_timestamp,received_at,credited_ms) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,input.eventId,input.type,input.position,client,now,credit]);
  const updated=(await c.query(`UPDATE academy.listening_sessions SET actual_listening_ms=actual_listening_ms+$2,last_received_at=$3::timestamptz,last_client_timestamp=$4,last_position=$5,playing=$6,ended_at=CASE WHEN $7::boolean THEN $3::timestamptz ELSE NULL END WHERE id=$1 RETURNING *`,[id,credit,now,client,input.position,input.type==='PLAY'?true:['PAUSE','END'].includes(input.type)?false:s.playing,input.type==='END'])).rows[0];return shape(updated);
 });}
}
