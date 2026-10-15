import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { AttachMediaDto } from './media.dto';
import { MediaUploadFieldsDto } from './media-upload.dto';
import { MediaService } from './media.service';

@ApiBearerAuth('access-token') @ApiTags('Media') @Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media:MediaService){}

  @Post('upload') @RequirePermission(Permission.MEDIA_MANAGE)
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:20*1024*1024,files:1,fields:3,fieldSize:8192}}))
  @ApiOperation({summary:'Upload audio, image or document to persistent object storage'}) @ApiConsumes('multipart/form-data')
  @ApiBody({schema:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary'},sectionId:{type:'string',format:'uuid'},questionId:{type:'string',format:'uuid'},durationSeconds:{type:'integer',minimum:1,maximum:86400}}}})
  @ApiSuccess(null) @ApiErrors(400,401,403,409,413,415)
  upload(@AuthenticatedUser() user:CurrentUser,@UploadedFile() file:any,@Body() body:MediaUploadFieldsDto){
    if(body.sectionId&&body.questionId)throw new BadRequestException('Choose either sectionId or questionId');
    return this.media.upload(user,file,{sectionId:body.sectionId,questionId:body.questionId},body.durationSeconds);
  }

  @Post(':id/attachments') @RequirePermission(Permission.MEDIA_MANAGE) @ApiOperation({summary:'Attach existing media to a section or question in the editable exam version'}) @ApiSuccess(null) @ApiErrors(400,401,403,404,409)
  attach(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:AttachMediaDto){return this.media.attachExisting(user,id,body);}

  @Get(':id/content') @RequirePermission(Permission.MEDIA_READ) @ApiOperation({summary:'Stream media after checking ownership or published assignment access'}) @ApiErrors(401,403,404)
  async content(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Res() response:Response){const item=await this.media.content(user,id);response.setHeader('Content-Type',item.mimeType);response.setHeader('Content-Length',item.size);response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','private, no-store');response.setHeader('Content-Disposition',`${item.type==='DOCUMENT'?'attachment':'inline'}; filename="${item.name}"`);response.status(200).send(item.stream);}

  @Delete(':id') @RequirePermission(Permission.MEDIA_MANAGE) @ApiOperation({summary:'Delete unreferenced media metadata and object storage file'}) @ApiSuccess(null) @ApiErrors(401,403,404,409)
  remove(@AuthenticatedUser() user:CurrentUser,@Param('id',ParseUUIDPipe) id:string){return this.media.remove(user,id);}
}
