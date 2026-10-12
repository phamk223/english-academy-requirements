import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaDto {
  @ApiProperty({ format: 'uuid' }) requestId!: string;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
}
export class FieldErrorDto {
  @ApiProperty({ example: 'username' }) field!: string;
  @ApiProperty({ example: 'isString' }) code!: string;
  @ApiProperty({ example: 'Field must be a string' }) message!: string;
}
export class ErrorDetailsDto {
  @ApiProperty({ example: 'UNAUTHORIZED' }) code!: string;
  @ApiProperty({ example: 'Authentication required' }) message!: string;
  @ApiPropertyOptional({ type: [FieldErrorDto] }) fields?: FieldErrorDto[];
}
export class ErrorEnvelopeDto {
  @ApiProperty({ enum: [false] }) success!: false;
  @ApiProperty({ type: ErrorDetailsDto }) error!: ErrorDetailsDto;
  @ApiProperty({ type: MetaDto }) meta!: MetaDto;
}

export function ApiSuccess(data: Type<unknown> | null, description = 'Success') {
  return applyDecorators(
    ApiExtraModels(MetaDto, ...(data ? [data] : [])),
    ApiResponse({ status: 200, description, schema: {
      type: 'object', required: ['success', 'data', 'meta'], properties: {
        success: { type: 'boolean', enum: [true] },
        data: data ? { $ref: getSchemaPath(data) } : { type: 'object', nullable: true, example: null },
        meta: { $ref: getSchemaPath(MetaDto) },
      },
    } }),
  );
}
export function ApiErrors(...statuses: number[]) {
  const descriptions: Record<number, string> = {
    400: 'Invalid body; VALIDATION_ERROR includes field-level errors',
    401: 'UNAUTHORIZED: invalid credentials/token, expired/revoked session or inactive account',
    403: 'FORBIDDEN: role or permission denied',
    413: 'PAYLOAD_TOO_LARGE: JSON exceeds 100 KB',
    429: 'TOO_MANY_REQUESTS: retry after Retry-After',
    500: 'INTERNAL_SERVER_ERROR: no internal details exposed',
    503: 'SERVICE_UNAVAILABLE: database unavailable',
  };
  const codes: Record<number, [string, string]> = {
    400: ['VALIDATION_ERROR', 'Validation failed'],
    401: ['UNAUTHORIZED', 'Authentication required'],
    403: ['FORBIDDEN', 'Access denied'],
    413: ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
    429: ['TOO_MANY_REQUESTS', 'Too many requests'],
    500: ['INTERNAL_SERVER_ERROR', 'Internal server error'],
    503: ['SERVICE_UNAVAILABLE', 'Service unavailable'],
  };
  return applyDecorators(ApiExtraModels(ErrorEnvelopeDto), ...statuses.map(status => ApiResponse({
    status, description: descriptions[status], content: { 'application/json': {
      schema: { $ref: getSchemaPath(ErrorEnvelopeDto) },
      example: { success: false, error: {
        code: codes[status][0], message: codes[status][1],
        ...(status === 400 ? { fields: [{ field: 'username', code: 'isString', message: 'Field must be a string' }] } : {}),
      }, meta: { requestId: '01564857-e86d-42cb-a624-0a07657c9da1', timestamp: '2026-10-12T00:00:00.000Z' } },
    } },
  })));
}
