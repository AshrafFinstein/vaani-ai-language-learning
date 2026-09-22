import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiException } from '../lib/errors.js';

/** Validates and replaces `req.body` with the parsed, typed result. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        ApiException.validation(
          'Validation failed',
          result.error.flatten().fieldErrors as Record<string, string[]>,
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}
