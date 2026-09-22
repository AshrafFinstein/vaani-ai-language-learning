import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS_BY_CODE, type ApiError } from '@vaani/types';
import { ApiException } from '../lib/errors.js';
import { isProd } from '../env.js';

/**
 * Converts any thrown error into the canonical {@link ApiError} envelope.
 * Keeps all four parameters so Express recognizes it as error-handling middleware.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiException) {
    apiError = { code: err.code, message: err.message, fields: err.fields };
  } else if (err instanceof ZodError) {
    apiError = {
      code: 'VALIDATION',
      message: 'Validation failed',
      fields: err.flatten().fieldErrors as Record<string, string[]>,
    };
  } else {
    // Unknown/unexpected: never leak internals in production.
    if (!isProd) console.error(err);
    apiError = { code: 'INTERNAL', message: 'Something went wrong' };
  }

  res.status(HTTP_STATUS_BY_CODE[apiError.code]).json({ error: apiError });
}

/** 404 fallback for unmatched routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
