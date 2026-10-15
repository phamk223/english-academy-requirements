import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { CreateListeningSessionDto, PlaybackEventDto } from './listening.dto';
import { ListeningService } from './listening.service';
@ApiTags('Listening') @ApiBearerAuth('access-token') @Controller('listening/sessions') @RequirePermission(Permission.OWN_LISTENING_WRITE)
export class ListeningController {
 constructor(@Inject(ListeningService) private readonly service:ListeningService){}
 @Post() @ApiOperation({summary:'Start/resume listening for attached audio in an IN_PROGRESS attempt'}) @ApiSuccess(Object,'Created',201) @ApiErrors(400,401,403,404,409)
 start(@AuthenticatedUser() u:CurrentUser,@Body() b:CreateListeningSessionDto){return this.service.start(u,b);}
 @Post(':id/events') @HttpCode(200) @ApiOperation({summary:'Record one idempotent playback event; position in seconds, heartbeat every 10 seconds'}) @ApiSuccess(Object) @ApiErrors(400,401,403,404,409)
 event(@AuthenticatedUser() u:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() b:PlaybackEventDto){return this.service.event(u,id,b);}
 @Post(':id/end') @HttpCode(200) @ApiOperation({summary:'Close session with an idempotent END event'}) @ApiSuccess(Object) @ApiErrors(400,401,403,404,409)
 end(@AuthenticatedUser() u:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() b:PlaybackEventDto){return this.service.event(u,id,b,true);}
}
