import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiPageSuccess, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { CreateExamDto, ExamListQueryDto, UpdateExamDto } from './exam.dto';
import { ExamResponseDto } from './exam.response.dto';
import { ExamService } from './exam.service';

@ApiBearerAuth('access-token')
@ApiTags('Exams')
@Controller('exams')
@RequirePermission(Permission.EXAMS_READ)
export class ExamController {
  constructor(@Inject(ExamService) private readonly exams:ExamService){}

  @Post() @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Create a draft exam with its first version'}) @ApiSuccess(ExamResponseDto) @ApiErrors(400,403,409,422)
  create(@AuthenticatedUser() user:CurrentUser,@Body() body:CreateExamDto){return this.exams.create(user,body);}

  @Get() @ApiOperation({summary:'List visible exams; students only see published exams'})
  @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiQuery({name:'status',required:false,enum:['DRAFT','PUBLISHED','ARCHIVED']}) @ApiQuery({name:'q',required:false})
  @ApiPageSuccess(ExamResponseDto) @ApiErrors(400,401,403)
  list(@AuthenticatedUser() user:CurrentUser,@Query() query:ExamListQueryDto){return this.exams.list(user,query);}

  @Get(':id') @ApiOperation({summary:'Read exam; a student receives only its published snapshot'}) @ApiSuccess(ExamResponseDto) @ApiErrors(400,401,403,404)
  get(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.exams.get(user,id);}

  @Patch(':id') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Edit draft, create next draft version, or publish it',description:'Editing a published exam creates a new version. PATCH {"status":"PUBLISHED"} publishes the draft; prior published versions stay immutable.'})
  @ApiSuccess(ExamResponseDto) @ApiErrors(400,403,404,409,422)
  update(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateExamDto){return this.exams.update(user,id,body);}

  @Delete(':id') @RequirePermission(Permission.EXAMS_MANAGE) @HttpCode(200) @Header('Cache-Control','no-store')
  @ApiOperation({summary:'Archive exam; published versions and attempts remain available'}) @ApiSuccess(ExamResponseDto) @ApiErrors(400,403,404)
  archive(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.exams.archive(user,id);}
}
