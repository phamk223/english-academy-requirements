import { Body, Controller, Delete, HttpCode, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { AccountsService } from './accounts.service';
import { DeletedAccountResponseDto, validateDeletionBody } from './accounts.dto';

@ApiTags('Accounts') @ApiBearerAuth('access-token') @Controller('users')
@RequirePermission(Permission.ACCOUNTS_DELETE)
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts:AccountsService){}

  @Delete(':id') @HttpCode(200)
  @ApiOperation({summary:'Delete a STUDENT/TEACHER account and revoke all tokens (ADMIN operator only)',description:'Only student/teacher accounts can be deleted. Any account with ADMIN role is protected, even when it also has STUDENT or TEACHER role (409). Soft deletion preserves history, hides the account from management and prevents login/reactivation. All access/refresh sessions are revoked. Repeated deletion is idempotent; no body is required.'})
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false}})
  @ApiSuccess(DeletedAccountResponseDto) @ApiErrors(400,401,403,404,409)
  remove(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
    validateDeletionBody(body);
    return this.accounts.remove(actor,id);
  }
}
