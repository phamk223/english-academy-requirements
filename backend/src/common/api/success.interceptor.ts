import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { PaginatedResult, responseMeta } from './contract';

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(map(data => {
      // HTTP 204/304 must not contain a response body.
      if (response.statusCode === 204 || response.statusCode === 304) return undefined;
      const meta = responseMeta(response);
      if (data instanceof PaginatedResult) {
        return { success: true, data: data.items, meta: { ...meta, pagination: data.pagination } };
      }
      return { success: true, data: data ?? null, meta };
    }));
  }
}
