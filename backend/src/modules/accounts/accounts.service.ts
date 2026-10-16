import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';

@Injectable()
export class AccountsService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}

  async remove(actor:CurrentUser,id:string){
    if(actor.id===id)throw new ConflictException('Administrators cannot delete their own account');
    const client=await this.db.pool.connect();
    try{
      await client.query('BEGIN');
      // Serialize account deletions so two administrators cannot delete each other concurrently.
      await client.query('SELECT pg_advisory_xact_lock(8701002)');
      const administrator=await client.query(`SELECT u.id FROM academy.users u
        WHERE u.id=$1 AND u.status='ACTIVE' AND u.deleted_at IS NULL
        AND EXISTS(SELECT 1 FROM academy.user_roles ur JOIN academy.roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='ADMIN')
        FOR SHARE OF u`,[actor.id]);
      if(!administrator.rowCount)throw new ForbiddenException();
      const target=(await client.query('SELECT id,deleted_at FROM academy.users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!target)throw new NotFoundException('Resource not found');
      let deletedAt=target.deleted_at;
      if(!deletedAt){
        deletedAt=(await client.query(`UPDATE academy.users SET status='INACTIVE',deleted_at=clock_timestamp(),deleted_by=$2 WHERE id=$1 RETURNING deleted_at`,[id,actor.id])).rows[0].deleted_at;
      }
      // Explicitly cover accounts that were already inactive before deletion, and every device/session.
      await client.query(`UPDATE academy.auth_sessions SET revoked_at=clock_timestamp() WHERE user_id=$1 AND revoked_at IS NULL`,[id]);
      await client.query('COMMIT');
      return{id,deleted:true,deletedAt};
    }catch(error){await client.query('ROLLBACK');throw error;}
    finally{client.release();}
  }
}
