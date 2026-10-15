import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
@Injectable()
export class AuditInterceptor implements NestInterceptor {
 private readonly logger=new Logger('Audit');
 constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
 intercept(context:ExecutionContext,next:CallHandler){const req=context.switchToHttp().getRequest(),res=context.switchToHttp().getResponse();return next.handle().pipe(mergeMap(async result=>{
  if(['POST','PATCH','DELETE','PUT'].includes(req.method)){
   const candidate=result?.id??result?.jobId??null;const id=typeof candidate==='string'&&/^[0-9a-f-]{36}$/i.test(candidate)?candidate:null;
   try{await this.db.pool.query(`INSERT INTO academy.audit_log(kind,actor_id,request_id,resource_type,resource_id,action) VALUES('REQUEST',$1,$2,$3,$4,$5)`,[req.currentUser?.id??result?.user?.id??null,res.locals.requestId,req.route?.path??'unknown',id,req.method]);}catch{this.logger.error(JSON.stringify({event:'request_audit_write_failed',requestId:res.locals.requestId}));}
  }return result;
 }));}
}
