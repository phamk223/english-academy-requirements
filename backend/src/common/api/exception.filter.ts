import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ErrorResponse, responseMeta } from './contract';
import { ApiValidationException } from './validation';

const errors: Record<number, [string, string]> = {
  400: ['BAD_REQUEST', 'Invalid request'],
  401: ['UNAUTHORIZED', 'Authentication required'],
  403: ['FORBIDDEN', 'Access denied'],
  404: ['NOT_FOUND', 'Resource not found'],
  405: ['METHOD_NOT_ALLOWED', 'Method not allowed'],
  409: ['CONFLICT', 'Resource conflict'],
  413: ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
  415: ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported media type'],
  422: ['UNPROCESSABLE_ENTITY', 'Request cannot be processed'],
  429: ['TOO_MANY_REQUESTS', 'Too many requests'],
  500: ['INTERNAL_SERVER_ERROR', 'Internal server error'],
  502: ['BAD_GATEWAY', 'Upstream service error'],
  503: ['SERVICE_UNAVAILABLE', 'Service unavailable'],
  504: ['GATEWAY_TIMEOUT', 'Upstream service timeout'],
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    let status = exception instanceof HttpException ? exception.getStatus() : 500;
    // Recognize body-parser errors, without returning the parser's raw body/message.
    const parserError = exception as { type?: unknown; status?: unknown } | null;
    if (parserError?.type === 'entity.parse.failed' && parserError.status === 400) status = 400;
    if (parserError?.type === 'entity.too.large' && parserError.status === 413) status = 413;
    if (parserError?.type === 'charset.unsupported' && parserError.status === 415) status = 415;
    if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
    let [code, message] = errors[status] ?? (status >= 500
      ? ['INTERNAL_SERVER_ERROR', 'Internal server error'] : ['REQUEST_FAILED', 'Request failed']);
    if (exception instanceof ApiValidationException) {
      code = 'VALIDATION_ERROR';
      message = 'Validation failed';
    }
    const body: ErrorResponse = {
      success: false,
      error: { code, message, ...(exception instanceof ApiValidationException ? { fields: exception.fields } : {}) },
      meta: responseMeta(response),
    };
    if (status >= 500) {
      // Deliberately exclude exception payloads and request bodies from logs.
      this.logger.error(`Request failed: requestId=${body.meta.requestId} status=${status}`);
    }
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json(body);
  }
}
