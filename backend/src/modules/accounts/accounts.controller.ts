import { Body, Controller, Delete, HttpCode, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';
import { ApiValidationException } from '../../common/api/validation';
import { RequirePermission } from '../../common/authorization/access.decorators';
import { Permission } from '../../common/authorization/permissions';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.service';
import { AccountsService } from './accounts.service';

class DeletedAccountResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({enum:[true]}) deleted!:boolean;
  @ApiProperty({format:'date-time'}) deletedAt!:string;
}

@ApiTags('Accounts') @ApiBearerAuth('access-token') @Controller('users')
@RequirePermission(Permission.ACCOUNTS_DELETE)
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts:AccountsService){}

  @Delete(':id') @HttpCode(200)
  @ApiOperation({summary:'Admin: delete an account and revoke all access/refresh tokens',description:'Soft deletion preserves exam/attempt/report history. Deleted accounts disappear from student/teacher management, cannot log in or be reactivated. Repeated deletion is idempotent. Self-deletion returns 409 to preserve administrator access. No request body is required.'})
  @ApiBody({required:false,schema:{type:'object',additionalProperties:false}})
  @ApiSuccess(DeletedAccountResponseDto) @ApiErrors(400,401,403,404,409)
  remove(@AuthenticatedUser() actor:CurrentUser,@Param('id',ParseUUIDPipe) id:string,@Body() body:unknown){
    if(body!==null&&body!==undefined){
      if(typeof body!=='object'||Array.isArray(body))throw new ApiValidationException([{field:'$',code:'isObject',message:'Body must be an empty object'}]);
      if(Object.keys(body).length)throw new ApiValidationException(Object.keys(body).map(field=>({field,code:'whitelistValidation',message:'Field is not allowed'})));
    }
    return this.accounts.remove(actor,id);
  }
}
