import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiPageSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { ReportQueryDto } from './reports.dto';
import { ReportsService } from './reports.service';
@ApiTags('Reports') @ApiBearerAuth('access-token') @Controller('reports') @RequirePermission(Permission.REPORTS_READ)
export class ReportsController {
 constructor(@Inject(ReportsService) private readonly service:ReportsService){}
 @Get('students') @ApiOperation({summary:'Student metrics; UTC ISO week/month, only fully graded scores enter average'}) @ApiPageSuccess(Object) @ApiErrors(400,401,403)
 students(@AuthenticatedUser() u:CurrentUser,@Query() q:ReportQueryDto){return this.service.report('students',u,q);}
 @Get('classes') @ApiOperation({summary:'Class metrics based on current memberships; teachers see assigned classes'}) @ApiPageSuccess(Object) @ApiErrors(400,401,403)
 classes(@AuthenticatedUser() u:CurrentUser,@Query() q:ReportQueryDto){return this.service.report('classes',u,q);}
 @Get('exams') @ApiOperation({summary:'Exam metrics across pinned versions'}) @ApiPageSuccess(Object) @ApiErrors(400,401,403)
 exams(@AuthenticatedUser() u:CurrentUser,@Query() q:ReportQueryDto){return this.service.report('exams',u,q);}
 @Get('listening') @ApiOperation({summary:'Observed listening seconds calculated from stored playback events'}) @ApiPageSuccess(Object) @ApiErrors(400,401,403)
 listening(@AuthenticatedUser() u:CurrentUser,@Query() q:ReportQueryDto){return this.service.report('listening',u,q);}
}
