import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PoolClient } from 'pg';
import { paginate, PaginatedResult } from '../../common/api/contract';
import { DatabaseService } from '../../database/database.service';
import { PasswordService } from '../auth/password.service';
import { CurrentUser } from '../auth/auth.service';
import { CreateClassDto, CreatePersonDto, PersonListQueryDto, UpdateClassDto, UpdatePersonDto } from './management.dto';

type PgFailure = Error & { code?: string };
function translate(error: unknown): never {
  if ((error as PgFailure)?.code === '23505') throw new ConflictException('Resource already exists');
  if ((error as PgFailure)?.code === '23503' || (error as PgFailure)?.code === '23514') {
    throw new UnprocessableEntityException('Related resource is invalid');
  }
  throw error;
}
function pageArgs(page: number, limit: number) { return [(page - 1) * limit, limit]; }
function canSeeAllClasses(user: CurrentUser) { return user.roles.includes('ADMIN'); }

@Injectable()
export class ManagementService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  private async createPerson(kind: 'student' | 'teacher', input: CreatePersonDto) {
    const temporaryPassword = randomBytes(24).toString('base64url');
    const hash = await this.passwords.hash(temporaryPassword);
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query(`INSERT INTO academy.users(username, password_hash) VALUES ($1,$2) RETURNING id,username,status,created_at`,
        [input.username.trim(), hash]);
      const profile = kind === 'student' ? 'student_profiles' : 'teacher_profiles';
      const codeColumn = kind === 'student' ? 'student_code' : 'teacher_code';
      const role = kind.toUpperCase();
      await client.query(`INSERT INTO academy.${profile}(user_id,${codeColumn},display_name,email) VALUES ($1,$2,$3,$4)`,
        [user.rows[0].id, input.code?.trim() ?? null, input.displayName.trim(), input.email?.trim() ?? null]);
      await client.query(`INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2`, [user.rows[0].id, role]);
      await client.query('COMMIT');
      return { ...user.rows[0], displayName: input.displayName.trim(), email: input.email ?? null, code: input.code ?? null, temporaryPassword };
    } catch (error) { await client.query('ROLLBACK'); return translate(error); }
    finally { client.release(); }
  }

  async createStudent(input: CreatePersonDto) { return this.createPerson('student', input); }
  async createTeacher(input: CreatePersonDto) { return this.createPerson('teacher', input); }

  async listPeople(kind: 'student' | 'teacher', query: PersonListQueryDto): Promise<PaginatedResult<unknown>> {
    const profile = kind === 'student' ? 'student_profiles' : 'teacher_profiles';
    const codeColumn = kind === 'student' ? 'student_code' : 'teacher_code';
    const where: string[] = ['u.deleted_at IS NULL'];
    const values: unknown[] = [];
    if (query.status) { values.push(query.status); where.push(`u.status = $${values.length}`); }
    if (query.q) {
      values.push(query.q.trim().toLocaleLowerCase());
      const n = values.length;
      where.push(`(position($${n} in lower(u.username_normalized)) > 0 OR position($${n} in lower(p.display_name)) > 0 OR position($${n} in lower(coalesce(p.email,''))) > 0 OR position($${n} in lower(coalesce(p.${codeColumn},''))) > 0)`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await this.database.pool.query(`SELECT count(*)::int AS total FROM academy.users u JOIN academy.${profile} p ON p.user_id=u.id ${filter}`, values);
    const [offset, limit] = pageArgs(query.page, query.limit);
    const rows = await this.database.pool.query(`SELECT u.id,u.username,u.status,p.display_name AS "displayName",p.email,p.${codeColumn} AS code,u.created_at AS "createdAt"
      FROM academy.users u JOIN academy.${profile} p ON p.user_id=u.id ${filter} ORDER BY u.created_at DESC,u.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]);
    return paginate(rows.rows, count.rows[0].total, query.page, query.limit);
  }

  async getPerson(kind: 'student' | 'teacher', id: string) {
    const profile = kind === 'student' ? 'student_profiles' : 'teacher_profiles';
    const codeColumn = kind === 'student' ? 'student_code' : 'teacher_code';
    const result = await this.database.pool.query(`SELECT u.id,u.username,u.status,p.display_name AS "displayName",p.email,p.${codeColumn} AS code,u.created_at AS "createdAt",u.updated_at AS "updatedAt"
      FROM academy.users u JOIN academy.${profile} p ON p.user_id=u.id WHERE u.id=$1 AND u.deleted_at IS NULL`, [id]);
    if (!result.rowCount) throw new NotFoundException('Resource not found');
    return result.rows[0];
  }

  async updatePerson(kind: 'student' | 'teacher', id: string, input: UpdatePersonDto) {
    const profile = kind === 'student' ? 'student_profiles' : 'teacher_profiles';
    const codeColumn = kind === 'student' ? 'student_code' : 'teacher_code';
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const exists = await client.query(`SELECT 1 FROM academy.${profile} p JOIN academy.users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.deleted_at IS NULL FOR UPDATE OF u,p`, [id]);
      if (!exists.rowCount) throw new NotFoundException('Resource not found');
      await client.query(`UPDATE academy.${profile} SET display_name=COALESCE($2,display_name),email=CASE WHEN $3 THEN $4 ELSE email END,${codeColumn}=CASE WHEN $5 THEN $6 ELSE ${codeColumn} END WHERE user_id=$1`,
        [id,input.displayName?.trim() ?? null,input.email !== undefined,input.email?.trim() ?? null,input.code !== undefined,input.code?.trim() ?? null]);
      await client.query('COMMIT');
      return this.getPerson(kind,id);
    } catch (error) { await client.query('ROLLBACK'); return translate(error); }
    finally { client.release(); }
  }

  async updateStatus(kind: 'student' | 'teacher', id: string, status: string) {
    const profile = kind === 'student' ? 'student_profiles' : 'teacher_profiles';
    const result = await this.database.pool.query(`UPDATE academy.users u SET status=$2 FROM academy.${profile} p WHERE u.id=$1 AND p.user_id=u.id AND u.deleted_at IS NULL RETURNING u.id,u.username,u.status,u.updated_at AS "updatedAt"`,[id,status]);
    if (!result.rowCount) throw new NotFoundException('Resource not found');
    return result.rows[0];
  }

  async resetStudentPassword(id: string) {
    const temporaryPassword = randomBytes(24).toString('base64url');
    const hash = await this.passwords.hash(temporaryPassword);
    const result = await this.database.pool.query(`UPDATE academy.users u SET password_hash=$2
      FROM academy.student_profiles p WHERE u.id=$1 AND p.user_id=u.id AND u.deleted_at IS NULL RETURNING u.id,u.username`,[id,hash]);
    if (!result.rowCount) throw new NotFoundException('Resource not found');
    return { ...result.rows[0], temporaryPassword };
  }

  async createClass(user: CurrentUser, input: CreateClassDto) {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(`INSERT INTO academy.classes(class_code,class_name,description,created_by) VALUES($1,$2,$3,$4) RETURNING *`,
        [input.classCode.trim(),input.className.trim(),input.description?.trim() ?? null,user.id]);
      if (user.roles.includes('TEACHER')) await client.query(`INSERT INTO academy.teacher_class_assignments(class_id,teacher_id,assigned_by) VALUES($1,$2,$2)`,[created.rows[0].id,user.id]);
      await client.query('COMMIT');
      return created.rows[0];
    } catch (error) { await client.query('ROLLBACK'); return translate(error); }
    finally { client.release(); }
  }

  async listClasses(user: CurrentUser, query: PersonListQueryDto) {
    const where: string[] = [];
    const values: unknown[] = [];
    if (query.status) { values.push(query.status); where.push(`c.status=$${values.length}`); }
    else where.push(`c.status <> 'ARCHIVED'`);
    if (!canSeeAllClasses(user)) { values.push(user.id); where.push(`EXISTS(SELECT 1 FROM academy.teacher_class_assignments ta WHERE ta.class_id=c.id AND ta.teacher_id=$${values.length})`); }
    if (query.q) { values.push(query.q.trim().toLocaleLowerCase()); where.push(`(position($${values.length} in lower(c.class_code))>0 OR position($${values.length} in lower(c.class_name))>0)`); }
    const filter = `WHERE ${where.join(' AND ')}`;
    const count = await this.database.pool.query(`SELECT count(*)::int AS total FROM academy.classes c ${filter}`,values);
    const [offset,limit] = pageArgs(query.page,query.limit);
    const rows = await this.database.pool.query(`SELECT c.id,c.class_code AS "classCode",c.class_name AS "className",c.description,c.status,c.created_at AS "createdAt",c.updated_at AS "updatedAt",count(m.student_id) FILTER (WHERE u.status='ACTIVE')::int AS "activeStudentCount"
      FROM academy.classes c LEFT JOIN academy.class_memberships m ON m.class_id=c.id LEFT JOIN academy.users u ON u.id=m.student_id ${filter}
      GROUP BY c.id ORDER BY c.created_at DESC,c.id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,limit,offset]);
    return paginate(rows.rows,count.rows[0].total,query.page,query.limit);
  }

  private async classRow(user: CurrentUser,id:string,client:PoolClient|typeof this.database.pool=this.database.pool) {
    const values: unknown[]=[id];
    let scope='';
    if(!canSeeAllClasses(user)){ values.push(user.id);scope=' AND EXISTS(SELECT 1 FROM academy.teacher_class_assignments ta WHERE ta.class_id=c.id AND ta.teacher_id=$2)'; }
    const row=await client.query(`SELECT c.* FROM academy.classes c WHERE c.id=$1${scope}`,values);
    if(!row.rowCount) throw new NotFoundException('Resource not found');
    return row.rows[0];
  }

  async getClass(user:CurrentUser,id:string){return this.classRow(user,id);}
  async updateClass(user:CurrentUser,id:string,input:UpdateClassDto){
    await this.classRow(user,id);
    const result=await this.database.pool.query(`UPDATE academy.classes SET class_name=COALESCE($2,class_name),description=CASE WHEN $3 THEN $4 ELSE description END,status=COALESCE($5,status) WHERE id=$1 AND archived_at IS NULL RETURNING *`,[id,input.className?.trim()??null,input.description!==undefined,input.description?.trim()??null,input.status??null]);
    if(!result.rowCount)throw new NotFoundException('Resource not found');
    return result.rows[0];
  }
  async archiveClass(user:CurrentUser,id:string){
    await this.classRow(user,id);
    const result=await this.database.pool.query(`UPDATE academy.classes SET status='ARCHIVED',archived_at=COALESCE(archived_at,now()) WHERE id=$1 RETURNING id,status,archived_at AS "archivedAt"`,[id]);
    return result.rows[0];
  }

  async addMember(user:CurrentUser,classId:string,studentId:string){
    await this.classRow(user,classId);
    const student=await this.database.pool.query(`SELECT 1 FROM academy.student_profiles p JOIN academy.users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.status='ACTIVE'`,[studentId]);
    if(!student.rowCount)throw new UnprocessableEntityException('An active student account is required');
    try { const result=await this.database.pool.query(`INSERT INTO academy.class_memberships(class_id,student_id,created_by) VALUES($1,$2,$3) RETURNING class_id AS "classId",student_id AS "studentId",created_at AS "createdAt"`,[classId,studentId,user.id]);return result.rows[0]; }
    catch(error){return translate(error);}
  }
  async listMembers(user:CurrentUser,classId:string,query:PersonListQueryDto){
    await this.classRow(user,classId);
    const values:unknown[]=[classId];
    const where=['m.class_id=$1','u.status=\'ACTIVE\''];
    if(query.q){values.push(query.q.trim().toLocaleLowerCase());const n=values.length;where.push(`(position($${n} in lower(u.username_normalized))>0 OR position($${n} in lower(p.display_name))>0)`);}
    const filter=`WHERE ${where.join(' AND ')}`;
    const count=await this.database.pool.query(`SELECT count(*)::int AS total FROM academy.class_memberships m JOIN academy.users u ON u.id=m.student_id JOIN academy.student_profiles p ON p.user_id=u.id ${filter}`,values);
    const [offset,limit]=pageArgs(query.page,query.limit);
    const rows=await this.database.pool.query(`SELECT u.id,u.username,p.display_name AS "displayName",p.email,p.student_code AS "studentCode" FROM academy.class_memberships m JOIN academy.users u ON u.id=m.student_id JOIN academy.student_profiles p ON p.user_id=u.id ${filter} ORDER BY p.display_name,u.id LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,limit,offset]);
    return paginate(rows.rows,count.rows[0].total,query.page,query.limit);
  }
  async removeMember(user:CurrentUser,classId:string,studentId:string){await this.classRow(user,classId);const result=await this.database.pool.query('DELETE FROM academy.class_memberships WHERE class_id=$1 AND student_id=$2 RETURNING student_id',[classId,studentId]);if(!result.rowCount)throw new NotFoundException('Resource not found');return null;}

  async assignTeacher(user:CurrentUser,classId:string,teacherId:string){
    await this.classRow(user,classId);
    const active=await this.database.pool.query(`SELECT 1 FROM academy.teacher_profiles p JOIN academy.users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.status='ACTIVE'`,[teacherId]);
    if(!active.rowCount)throw new UnprocessableEntityException('An active teacher account is required');
    try{const result=await this.database.pool.query(`INSERT INTO academy.teacher_class_assignments(class_id,teacher_id,assigned_by) VALUES($1,$2,$3) RETURNING class_id AS "classId",teacher_id AS "teacherId",assigned_at AS "assignedAt"`,[classId,teacherId,user.id]);return result.rows[0];}
    catch(error){return translate(error);}
  }
  async listClassTeachers(user:CurrentUser,classId:string){await this.classRow(user,classId);const result=await this.database.pool.query(`SELECT u.id,u.username,p.display_name AS "displayName",p.email FROM academy.teacher_class_assignments a JOIN academy.users u ON u.id=a.teacher_id JOIN academy.teacher_profiles p ON p.user_id=u.id WHERE a.class_id=$1 AND u.status='ACTIVE' ORDER BY p.display_name,u.id`,[classId]);return result.rows;}
  async removeTeacher(user:CurrentUser,classId:string,teacherId:string){await this.classRow(user,classId);const result=await this.database.pool.query('DELETE FROM academy.teacher_class_assignments WHERE class_id=$1 AND teacher_id=$2 RETURNING teacher_id',[classId,teacherId]);if(!result.rowCount)throw new NotFoundException('Resource not found');return null;}
}
