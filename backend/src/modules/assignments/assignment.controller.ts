import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiPageSuccess, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { AssignmentListQueryDto, CreateAssignmentDto } from './assignment.dto';
import { AssignmentService } from './assignment.service';

@ApiBearerAuth('access-token') @ApiTags('Assignments') @Controller() @RequirePermission(Permission.ASSIGNMENTS_READ)
export class AssignmentController {
  constructor(@Inject(AssignmentService) private readonly assignments:AssignmentService){}
  @Post('exams/:id/assignments') @RequirePermission(Permission.ASSIGNMENTS_MANAGE) @ApiOperation({summary:'Assign a published exam directly to a student or to a class'}) @ApiSuccess(null) @ApiErrors(400,401,403,404,409,422)
  create(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:CreateAssignmentDto){return this.assignments.create(user,id,body);}
  @Get('students/me/assignments') @ApiOperation({summary:'List published exams assigned to the current student'}) @ApiPageSuccess(Object) @ApiErrors(401,403)
  own(@AuthenticatedUser() user:CurrentUser,@Query() query:AssignmentListQueryDto){return this.assignments.own(user,query.page,query.limit);}
  @Get('students/:id/assignments') @ApiOperation({summary:'List student assignments for Admin or an assigned Teacher'}) @ApiPageSuccess(Object) @ApiErrors(401,403,404)
  forStudent(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Query() query:AssignmentListQueryDto){return this.assignments.forStudent(user,id,query.page,query.limit);}
}
