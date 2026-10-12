import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export interface FieldError { field: string; code: string; message: string }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
export interface ResponseMeta { requestId: string; timestamp: string; pagination?: PaginationMeta }
export interface SuccessResponse<T> { success: true; data: T; meta: ResponseMeta }
export interface ErrorResponse {
  success: false;
  error: { code: string; message: string; fields?: FieldError[] };
  meta: ResponseMeta;
}

export function responseMeta(response: Response): ResponseMeta {
  // Also covers framework failures before the request middleware runs.
  const requestId: string = response.locals.requestId ?? randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  return { requestId, timestamp: new Date().toISOString() };
}

export function requestIdMiddleware(_request: Request, response: Response, next: () => void) {
  // Server-generated ID; never trust or echo an arbitrary client header.
  response.locals.requestId = randomUUID();
  response.setHeader('X-Request-Id', response.locals.requestId);
  next();
}

export class PaginatedResult<T> {
  constructor(readonly items: T[], readonly pagination: PaginationMeta) {}
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || items.length > limit || items.length > total) {
    throw new Error('Invalid pagination result');
  }
  return new PaginatedResult(items, { page, limit, total, totalPages: Math.ceil(total / limit) });
}
