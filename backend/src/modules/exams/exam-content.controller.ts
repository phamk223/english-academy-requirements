import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiPageSuccess, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { CreateQuestionDto, CreateSectionDto, QuestionListQueryDto, ReorderQuestionsDto, UpdateQuestionDto, UpdateSectionDto } from './exam-content.dto';
import { ExamContentService } from './exam-content.service';
import { DeletedExamContentResponseDto, ExamQuestionResponseDto, ExamSectionResponseDto, ReorderedQuestionsResponseDto } from './exam-content.response.dto';

@ApiBearerAuth('access-token')
@ApiTags('Exam Sections & Questions')
@Controller()
@RequirePermission(Permission.EXAMS_READ)
export class ExamContentController {
  constructor(@Inject(ExamContentService) private readonly content:ExamContentService){}

  @Post('exams/:examId/sections') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Add a skill section to the current exam draft'}) @ApiSuccess(ExamSectionResponseDto) @ApiErrors(400,403,404,409)
  createSection(@AuthenticatedUser() user:CurrentUser,@Param('examId',ParseUUIDPipe) examId:string,@Body() body:CreateSectionDto){return this.content.createSection(user,examId,body);}

  @Patch('sections/:id') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Update section type, config or stable order'}) @ApiSuccess(ExamSectionResponseDto) @ApiErrors(400,403,404,409)
  updateSection(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateSectionDto){return this.content.updateSection(user,id,body);}

  @Delete('sections/:id') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Delete a section and its draft questions, options and answer keys; prior published versions stay intact'}) @ApiSuccess(DeletedExamContentResponseDto) @ApiErrors(403,404,409)
  deleteSection(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.content.deleteSection(user,id);}

  @Post('sections/:sectionId/questions') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Add a question with type-validated options and answer key'}) @ApiSuccess(ExamQuestionResponseDto) @ApiErrors(400,403,404,409)
  createQuestion(@AuthenticatedUser() user:CurrentUser,@Param('sectionId',ParseUUIDPipe) sectionId:string,@Body() body:CreateQuestionDto){return this.content.createQuestion(user,sectionId,body);}

  @Get('sections/:sectionId/questions') @RequirePermission(Permission.EXAMS_READ)
  @ApiOperation({summary:'List section questions; answerKey is returned only to Admin/Teacher'}) @ApiQuery({name:'page',required:false}) @ApiQuery({name:'limit',required:false}) @ApiPageSuccess(ExamQuestionResponseDto) @ApiErrors(400,401,403,404)
  listQuestions(@AuthenticatedUser() user:CurrentUser,@Param('sectionId',ParseUUIDPipe) sectionId:string,@Query() query:QuestionListQueryDto){return this.content.listQuestions(user,sectionId,query.page,query.limit);}

  @Patch('questions/:questionId') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Update a question in the exam draft; content is validated against its type'}) @ApiSuccess(ExamQuestionResponseDto) @ApiErrors(400,403,404,409)
  updateQuestion(@AuthenticatedUser() user:CurrentUser,@Param('questionId',ParseUUIDPipe) id:string,@Body() body:UpdateQuestionDto){return this.content.updateQuestion(user,id,body);}

  @Delete('questions/:questionId') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Delete a question from the current exam draft'}) @ApiSuccess(DeletedExamContentResponseDto) @ApiErrors(403,404,409)
  deleteQuestion(@AuthenticatedUser() user:CurrentUser,@Param('questionId',ParseUUIDPipe) id:string){return this.content.deleteQuestion(user,id);}

  @Post('questions/reorder') @RequirePermission(Permission.EXAMS_MANAGE)
  @ApiOperation({summary:'Atomically reorder every question in a section by ordered questionIds'}) @ApiSuccess(ReorderedQuestionsResponseDto) @ApiErrors(400,403,404,409)
  reorder(@AuthenticatedUser() user:CurrentUser,@Body() body:ReorderQuestionsDto){return this.content.reorderQuestions(user,body.sectionId,body.questionIds);}
}
