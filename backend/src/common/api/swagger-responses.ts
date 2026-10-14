import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaDto {
  @ApiProperty({ format: 'uuid' }) requestId!: string;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
  @ApiPropertyOptional({ type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } }) pagination?: object;
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

export function ApiSuccess(data: Type<unknown> | null, description = 'Success', status = 200) {
  return applyDecorators(
    ApiExtraModels(MetaDto, ...(data ? [data] : [])),
    ApiResponse({ status, description, schema: {
      type: 'object', required: ['success', 'data', 'meta'], properties: {
        success: { type: 'boolean', enum: [true] },
        data: data ? { $ref: getSchemaPath(data) } : { type: 'object', nullable: true, example: null },
        meta: { $ref: getSchemaPath(MetaDto) },
      },
    } }),
  );
}
export function ApiPageSuccess(data: Type<unknown>, description = 'Paginated list') {
  return applyDecorators(
    ApiExtraModels(MetaDto, data),
    ApiResponse({ status: 200, description, schema: {
      type: 'object', required: ['success', 'data', 'meta'], properties: {
        success: { type: 'boolean', enum: [true] },
        data: { type: 'array', items: { $ref: getSchemaPath(data) } },
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
    404: 'NOT_FOUND: resource does not exist or is not visible to the current user',
    409: 'CONFLICT: resource state or uniqueness constraint conflict',
    413: 'PAYLOAD_TOO_LARGE: JSON exceeds 100 KB',
    415: 'UNSUPPORTED_MEDIA_TYPE: file type is not allowed or does not match its contents',
    429: 'TOO_MANY_REQUESTS: retry after Retry-After',
    422: 'UNPROCESSABLE_ENTITY: request is valid but conflicts with a domain rule',
    500: 'INTERNAL_SERVER_ERROR: no internal details exposed',
    503: 'SERVICE_UNAVAILABLE: database unavailable',
  };
  const codes: Record<number, [string, string]> = {
    400: ['VALIDATION_ERROR', 'Validation failed'],
    401: ['UNAUTHORIZED', 'Authentication required'],
    403: ['FORBIDDEN', 'Access denied'],
    404: ['NOT_FOUND', 'Resource not found'],
    409: ['CONFLICT', 'Resource conflict'],
    422: ['UNPROCESSABLE_ENTITY', 'Request could not be processed'],
    413: ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
    415: ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported media type'],
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
