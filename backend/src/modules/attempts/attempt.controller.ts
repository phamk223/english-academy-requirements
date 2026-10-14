import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { SaveAttemptAnswersDto } from './attempt.dto';
import { AttemptResponseDto } from './attempt.response.dto';
import { AttemptService } from './attempt.service';
import { ApiValidationException } from '../../common/api/validation';

function emptyBody(body:unknown){if(body===undefined||body===null)return;if(typeof body!=='object'||Array.isArray(body))throw new ApiValidationException([{field:'$',code:'isObject',message:'Body must be an empty object'}]);if(Object.keys(body).length)throw new ApiValidationException(Object.keys(body).map(field=>({field,code:'whitelistValidation',message:'Field is not allowed'})));}

@ApiTags('Attempts') @ApiBearerAuth('access-token') @Controller()
export class AttemptController {
  constructor(@Inject(AttemptService) private readonly attempts:AttemptService){}
  @Post('exams/:id/attempts') @RequirePermission(Permission.OWN_ATTEMPTS_MANAGE) @ApiOperation({summary:'Start or resume an attempt pinned to the published version; requires active assignment'}) @ApiBody({required:false,schema:{type:'object',additionalProperties:false}}) @ApiSuccess(AttemptResponseDto,'Attempt started or resumed',201) @ApiErrors(400,401,403,404)
  start(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){emptyBody(body);return this.attempts.start(user,id);}
  @Get('attempts/:id') @RequirePermission(Permission.ATTEMPTS_READ) @ApiOperation({summary:'Read pinned exam and answers; Student owns attempt, Teacher owns exam, Admin sees all'}) @ApiSuccess(AttemptResponseDto) @ApiErrors(400,401,403,404)
  get(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.attempts.get(user,id);}
  @Patch('attempts/:id/answers') @RequirePermission(Permission.OWN_ATTEMPTS_MANAGE) @ApiOperation({summary:'Atomically save answers while IN_PROGRESS; score fields are forbidden'}) @ApiSuccess(AttemptResponseDto) @ApiErrors(400,401,403,404,409)
  save(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:SaveAttemptAnswersDto){return this.attempts.save(user,id,body);}
  @Post('attempts/:id/submit') @HttpCode(200) @RequirePermission(Permission.OWN_ATTEMPTS_MANAGE) @ApiOperation({summary:'Idempotent submission; server grades saved objective answers, marks Writing/Speaking for manual grading'}) @ApiSuccess(AttemptResponseDto) @ApiErrors(400,401,403,404,409)
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false}})
  submit(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){emptyBody(body);return this.attempts.submit(user,id);}
}
