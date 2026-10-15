import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { ImportService } from './import.service';
import { ApiValidationException } from '../../common/api/validation';
function noFields(b:any){if(b&&Object.keys(b).length)throw new ApiValidationException(Object.keys(b).map(field=>({field,code:'whitelistValidation',message:'Field is not allowed'})));}
@ApiTags('Exam Imports') @ApiBearerAuth('access-token') @Controller('exam-imports') @RequirePermission(Permission.IMPORTS_MANAGE)
export class ImportController {
 constructor(@Inject(ImportService) private readonly service:ImportService){}
 @Post() @HttpCode(202) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20971520,files:1,fields:0}})) @ApiConsumes('multipart/form-data')
 @ApiBody({schema:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary'}}}}) @ApiOperation({summary:'Store source and enqueue async import; no heavy parsing in HTTP'}) @ApiSuccess(Object,'Accepted',202) @ApiErrors(400,401,403,413,415,429)
 upload(@AuthenticatedUser() u:CurrentUser,@UploadedFile() f:any,@Req() request:any,@Body() b:any){noFields(b);return this.service.upload(u,f,request.res.locals.requestId);}
 @Get(':id') @ApiOperation({summary:'Poll own job status/result/error; no answer keys or storage keys returned'}) @ApiSuccess(Object) @ApiErrors(400,401,403,404)
 get(@AuthenticatedUser() u:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.service.get(u,id);}
 @Post(':id/review') @HttpCode(200) @ApiOperation({summary:'Acknowledge teacher review: NEEDS_REVIEW → READY; exam stays DRAFT until explicitly published'}) @ApiSuccess(Object) @ApiErrors(400,401,403,404,409)
 review(@AuthenticatedUser() u:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() b:any){noFields(b);return this.service.review(u,id);}
}
