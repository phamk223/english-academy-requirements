import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { paginate } from '../../common/api/contract';
import { DatabaseService } from '../../database/database.service';
import { CurrentUser } from '../auth/auth.service';
import { CreateAssignmentDto } from './assignment.dto';

@Injectable()
export class AssignmentService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  async create(user:CurrentUser,examId:string,input:CreateAssignmentDto){
    if(Boolean(input.studentId)===Boolean(input.classId))throw new BadRequestException('Exactly one of studentId or classId is required');
    const exam=await this.db.pool.query(`SELECT id,status,created_by FROM academy.exams WHERE id=$1`,[examId]);if(!exam.rowCount)throw new NotFoundException('Resource not found');
    if(!user.roles.includes('ADMIN')&&exam.rows[0].created_by!==user.id)throw new NotFoundException('Resource not found');
    if(exam.rows[0].status!=='PUBLISHED')throw new ConflictException('Only published exams can be assigned');
    const target=input.studentId?await this.db.pool.query(`SELECT u.status FROM academy.student_profiles p JOIN academy.users u ON u.id=p.user_id WHERE p.user_id=$1`,[input.studentId]):await this.db.pool.query(`SELECT c.status FROM academy.classes c WHERE c.id=$1`,[input.classId]);
    if(!target.rowCount||target.rows[0].status!=='ACTIVE')throw new UnprocessableEntityException('An active student or class is required');
    if(input.classId&&user.roles.includes('TEACHER')&&!user.roles.includes('ADMIN')){const assigned=await this.db.pool.query(`SELECT 1 FROM academy.teacher_class_assignments WHERE teacher_id=$1 AND class_id=$2`,[user.id,input.classId]);if(!assigned.rowCount)throw new NotFoundException('Resource not found');}
    try{const r=await this.db.pool.query(`INSERT INTO academy.exam_assignments(exam_id,student_id,class_id,due_at,assigned_by) VALUES($1,$2,$3,$4,$5) RETURNING id,exam_id AS "examId",student_id AS "studentId",class_id AS "classId",due_at AS "dueAt",status,created_at AS "createdAt"`,[examId,input.studentId??null,input.classId??null,input.dueAt??null,user.id]);return r.rows[0];}catch(e){if((e as any)?.code==='23505')throw new ConflictException('An active assignment already exists for this target');throw e;}
  }
  private async list(user:CurrentUser,studentId:string,page:number,limit:number){
    const access=await this.db.pool.query(`SELECT u.id FROM academy.users u JOIN academy.student_profiles p ON p.user_id=u.id WHERE u.id=$1 AND u.status='ACTIVE'`,[studentId]);if(!access.rowCount)throw new NotFoundException('Resource not found');
    const teacherScope=user.roles.includes('TEACHER')&&!user.roles.includes('ADMIN');
    if(teacherScope){const visible=await this.db.pool.query(`SELECT 1 FROM academy.exam_assignments a JOIN academy.exams e ON e.id=a.exam_id WHERE a.student_id=$1 AND a.status='ACTIVE' AND e.created_by=$2 UNION ALL SELECT 1 FROM academy.teacher_class_assignments t JOIN academy.class_memberships m ON m.class_id=t.class_id JOIN academy.classes c ON c.id=t.class_id WHERE t.teacher_id=$2 AND m.student_id=$1 AND c.status='ACTIVE' LIMIT 1`,[studentId,user.id]);if(!visible.rowCount)throw new NotFoundException('Resource not found');}
    const source=`WITH effective AS (
      SELECT a.exam_id,a.due_at,'DIRECT'::text AS source FROM academy.exam_assignments a JOIN academy.exams own_e ON own_e.id=a.exam_id WHERE a.student_id=$1 AND a.status='ACTIVE' AND (NOT $2::boolean OR own_e.created_by=$3)
      UNION ALL
      SELECT a.exam_id,a.due_at,'CLASS'::text FROM academy.exam_assignments a JOIN academy.class_memberships m ON m.class_id=a.class_id AND m.student_id=$1 JOIN academy.classes c ON c.id=a.class_id AND c.status='ACTIVE' JOIN academy.users su ON su.id=m.student_id AND su.status='ACTIVE' WHERE a.status='ACTIVE' AND (NOT $2::boolean OR EXISTS(SELECT 1 FROM academy.teacher_class_assignments ta WHERE ta.class_id=a.class_id AND ta.teacher_id=$3))
    ), grouped AS (SELECT exam_id,min(due_at) AS due_at,array_agg(DISTINCT source ORDER BY source) AS sources FROM effective GROUP BY exam_id)
    SELECT e.id AS "examId",v.title,e.status AS "examStatus",g.due_at AS "dueAt",g.sources,v.id AS "examVersionId",v.version_number AS "versionNumber",v.sections,v.published_at AS "publishedAt" FROM grouped g JOIN academy.exams e ON e.id=g.exam_id AND e.status='PUBLISHED' JOIN academy.exam_versions v ON v.id=e.published_version_id`;
    const values=[studentId,teacherScope,user.id];const count=await this.db.pool.query(`SELECT count(*)::int AS total FROM (${source}) x`,values);const rows=await this.db.pool.query(`${source} ORDER BY g.due_at NULLS LAST,e.id LIMIT $4 OFFSET $5`,[...values,limit,(page-1)*limit]);return paginate(rows.rows,count.rows[0].total,page,limit);
  }
  async own(user:CurrentUser,page:number,limit:number){return this.list(user,user.id,page,limit);}
  async forStudent(user:CurrentUser,id:string,page:number,limit:number){if(user.id===id&&user.roles.includes('STUDENT'))return this.list(user,id,page,limit);if(!user.roles.includes('ADMIN')&&!user.roles.includes('TEACHER'))throw new ForbiddenException();return this.list(user,id,page,limit);}
}
