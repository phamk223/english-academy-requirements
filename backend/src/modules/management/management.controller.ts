import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiPageSuccess, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import {
  ClassListQueryDto, CreateClassDto, CreatePersonDto, MembershipDto, PersonListQueryDto,
  StatusDto, TeacherAssignmentDto, UpdateClassDto, UpdatePersonDto,
} from './management.dto';
import { ManagementService } from './management.service';
import { ClassMemberDto, ManagedClassDto, ManagedPersonDto, MembershipResultDto } from './management.response.dto';
import { AccountsService } from '../accounts/accounts.service';
import { DeletedAccountResponseDto, validateDeletionBody } from '../accounts/accounts.dto';

@ApiBearerAuth('access-token')
@ApiTags('Students')
@Controller('students')
@RequirePermission(Permission.STUDENTS_MANAGE)
export class StudentsController {
  constructor(@Inject(ManagementService) private readonly service: ManagementService,@Inject(AccountsService) private readonly accounts:AccountsService) {}
  @Post() @ApiOperation({ summary: 'Create student and generate a one-time password' }) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,409,422)
  create(@Body() body:CreatePersonDto){return this.service.createStudent(body);}
  @Get() @RequirePermission(Permission.STUDENTS_READ) @ApiOperation({summary:'List students with search, status filter and pagination'}) @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiQuery({name:'q',required:false}) @ApiQuery({name:'status',required:false,enum:['ACTIVE','LOCKED','INACTIVE']}) @ApiPageSuccess(ManagedPersonDto) @ApiErrors(400)
  list(@Query() query:PersonListQueryDto){return this.service.listPeople('student',query);}
  @Get(':id') @RequirePermission(Permission.STUDENTS_READ) @ApiOperation({summary:'Get a student'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404)
  get(@Param('id',ParseUUIDPipe) id:string){return this.service.getPerson('student',id);}
  @Patch(':id') @ApiOperation({summary:'Update student profile'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404,409)
  update(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdatePersonDto){return this.service.updatePerson('student',id,body);}
  @Post(':id/reset-password') @ApiOperation({summary:'Reset password; the new temporary password is returned once'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404)
  reset(@Param('id',ParseUUIDPipe) id:string){return this.service.resetStudentPassword(id);}
  @Patch(':id/status') @RequirePermission(Permission.ACCOUNTS_STATUS) @ApiOperation({summary:'ADMIN: lock/unlock student account',description:'Set LOCKED to block login and revoke all access/refresh tokens. Set ACTIVE to unlock; the user must log in again. INACTIVE is also supported. Accounts with ADMIN role are protected (409); deleted accounts cannot be restored (404).'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,401,403,404,409)
  status(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:StatusDto){return this.service.updateStatus(actor,'student',id,body.status);}
  @Delete(':id') @RequirePermission(Permission.ACCOUNTS_DELETE) @HttpCode(200)
  @ApiOperation({summary:'Delete former student account and revoke all tokens',description:'ADMIN operator only. Soft delete preserves exam history; account cannot log in or be reactivated. Any account that also has ADMIN role is protected (409).'})
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @ApiSuccess(DeletedAccountResponseDto) @ApiErrors(400,401,403,404,409)
  remove(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){validateDeletionBody(body);return this.accounts.remove(actor,id,'STUDENT');}
}

@ApiBearerAuth('access-token')
@ApiTags('Teachers')
@Controller('teachers')
@RequirePermission(Permission.TEACHERS_MANAGE)
export class TeachersController {
  constructor(@Inject(ManagementService) private readonly service:ManagementService,@Inject(AccountsService) private readonly accounts:AccountsService){}
  @Post() @ApiOperation({summary:'Create teacher and generate a one-time password'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,409,422)
  create(@Body() body:CreatePersonDto){return this.service.createTeacher(body);}
  @Get() @RequirePermission(Permission.TEACHERS_READ) @ApiOperation({summary:'List teachers with search, status filter and pagination'}) @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiQuery({name:'q',required:false}) @ApiQuery({name:'status',required:false,enum:['ACTIVE','LOCKED','INACTIVE']}) @ApiPageSuccess(ManagedPersonDto) @ApiErrors(400)
  list(@Query() query:PersonListQueryDto){return this.service.listPeople('teacher',query);}
  @Get(':id') @RequirePermission(Permission.TEACHERS_READ) @ApiOperation({summary:'Get a teacher'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404)
  get(@Param('id',ParseUUIDPipe) id:string){return this.service.getPerson('teacher',id);}
  @Patch(':id') @ApiOperation({summary:'Update teacher profile'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404,409)
  update(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdatePersonDto){return this.service.updatePerson('teacher',id,body);}
  @Patch(':id/status') @RequirePermission(Permission.ACCOUNTS_STATUS) @ApiOperation({summary:'ADMIN: lock/unlock teacher account',description:'Set LOCKED to block login and revoke all access/refresh tokens. Set ACTIVE to unlock; the user must log in again. INACTIVE is also supported. Accounts with ADMIN role are protected (409); deleted accounts cannot be restored (404).'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,401,403,404,409)
  status(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:StatusDto){return this.service.updateStatus(actor,'teacher',id,body.status);}
  @Delete(':id') @RequirePermission(Permission.ACCOUNTS_DELETE) @HttpCode(200) @Header('Cache-Control','no-store')
  @ApiOperation({summary:'Delete former teacher account and revoke all tokens',description:'ADMIN operator only. Soft delete preserves exam/class history; account cannot log in or be reactivated. Any account that also has ADMIN role is protected (409).'})
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @ApiSuccess(DeletedAccountResponseDto) @ApiErrors(400,401,403,404,409)
  remove(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){validateDeletionBody(body);return this.accounts.remove(actor,id,'TEACHER');}
}

@ApiBearerAuth('access-token')
@ApiTags('Classes')
@Controller('classes')
@RequirePermission(Permission.CLASSES_MANAGE)
export class ClassesController {
  constructor(@Inject(ManagementService) private readonly service:ManagementService){}
  @Post() @ApiOperation({summary:'Create class; teachers are assigned to the class they create'}) @ApiSuccess(ManagedClassDto) @ApiErrors(400,409)
  create(@AuthenticatedUser() user:CurrentUser,@Body() body:CreateClassDto){return this.service.createClass(user,body);}
  @Get() @RequirePermission(Permission.CLASSES_READ) @ApiOperation({summary:'List classes (teachers see assigned classes)'}) @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiQuery({name:'q',required:false}) @ApiQuery({name:'status',required:false,enum:['ACTIVE','INACTIVE','ARCHIVED']}) @ApiPageSuccess(ManagedClassDto) @ApiErrors(400)
  list(@AuthenticatedUser() user:CurrentUser,@Query() query:ClassListQueryDto){return this.service.listClasses(user,query);}
  @Get(':id') @RequirePermission(Permission.CLASSES_READ) @ApiOperation({summary:'Get class (teachers must be assigned)'}) @ApiSuccess(ManagedClassDto) @ApiErrors(400,404)
  get(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.service.getClass(user,id);}
  @Patch(':id') @ApiOperation({summary:'Update class'}) @ApiSuccess(ManagedClassDto) @ApiErrors(400,404,409)
  update(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateClassDto){return this.service.updateClass(user,id,body);}
  @Delete(':id') @HttpCode(200) @ApiOperation({summary:'Archive class without deleting history'}) @ApiSuccess(ManagedClassDto) @ApiErrors(400,404)
  archive(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.service.archiveClass(user,id);}
  @Post(':id/members') @ApiOperation({summary:'Add an active student; duplicate membership returns 409'}) @ApiSuccess(MembershipResultDto) @ApiErrors(400,404,409,422)
  addMember(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:MembershipDto){return this.service.addMember(user,id,body.studentId);}
  @Get(':id/members') @RequirePermission(Permission.CLASSES_MEMBERS_READ) @ApiOperation({summary:'List active members with pagination; locked/inactive students are hidden'}) @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiQuery({name:'q',required:false}) @ApiPageSuccess(ClassMemberDto) @ApiErrors(400,404)
  listMembers(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Query() query:PersonListQueryDto){return this.service.listMembers(user,id,query);}
  @Delete(':id/members/:studentId') @HttpCode(200) @ApiOperation({summary:'Remove student membership'}) @ApiSuccess(null) @ApiErrors(400,404)
  removeMember(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Param('studentId',ParseUUIDPipe) studentId:string){return this.service.removeMember(user,id,studentId);}
  @Post(':id/teachers') @ApiOperation({summary:'Assign active teacher to class; duplicate assignment returns 409'}) @ApiSuccess(MembershipResultDto) @ApiErrors(400,404,409,422)
  assignTeacher(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:TeacherAssignmentDto){return this.service.assignTeacher(user,id,body.teacherId);}
  @Get(':id/teachers') @RequirePermission(Permission.CLASSES_READ) @ApiOperation({summary:'List active teachers assigned to class'}) @ApiSuccess(ManagedPersonDto) @ApiErrors(400,404)
  listTeachers(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.service.listClassTeachers(user,id);}
  @Delete(':id/teachers/:teacherId') @HttpCode(200) @ApiOperation({summary:'Remove teacher assignment'}) @ApiSuccess(null) @ApiErrors(400,404)
  removeTeacher(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Param('teacherId',ParseUUIDPipe) teacherId:string){return this.service.removeTeacher(user,id,teacherId);}
}
