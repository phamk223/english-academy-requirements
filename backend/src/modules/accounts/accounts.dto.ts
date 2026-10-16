import { ApiProperty } from '@nestjs/swagger';
import { ApiValidationException } from '../../common/api/validation';

export class DeletedAccountResponseDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({enum:[true]}) deleted!:boolean;
  @ApiProperty({format:'date-time'}) deletedAt!:string;
}

export function validateDeletionBody(body:unknown){
  if(body===null||body===undefined)return;
  if(typeof body!=='object'||Array.isArray(body))throw new ApiValidationException([{field:'$',code:'isObject',message:'Body must be an empty object'}]);
  if(Object.keys(body).length)throw new ApiValidationException(Object.keys(body).map(field=>({field,code:'whitelistValidation',message:'Field is not allowed'})));
}
