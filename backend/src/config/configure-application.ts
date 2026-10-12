import type { INestApplication } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';
import { requestIdMiddleware } from '../common/api/contract';
import { ApiExceptionFilter } from '../common/api/exception.filter';
import { SuccessInterceptor } from '../common/api/success.interceptor';
import { createValidationPipe } from '../common/api/validation';
import { rateLimit } from 'express-rate-limit';
import { HttpException } from '@nestjs/common';

// Reused by production bootstrap and HTTP integration tests.
export function configureApplication(app: INestApplication): void {
  app.use(requestIdMiddleware);
  app.use(helmet());
  const limited = (_request: unknown, _response: unknown, next: (error?: unknown) => void) =>
    next(new HttpException('Too many requests', 429));
  app.use('/auth', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, handler: limited }));
  app.use('/auth/login', rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, handler: limited }));
  app.use(express.json({ limit: '100kb' }));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new SuccessInterceptor());
  app.enableShutdownHooks();
}
