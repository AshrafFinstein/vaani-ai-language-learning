import { type ApiErrorCode } from '@vaani/types';

/**
 * Domain error carrying a canonical {@link ApiErrorCode}. The central error handler
 * maps it to the right HTTP status and a safe response body.
 */
export class ApiException extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiException';
  }

  static badRequest(msg = 'Bad request') {
    return new ApiException('BAD_REQUEST', msg);
  }
  static unauthorized(msg = 'Not authenticated') {
    return new ApiException('UNAUTHORIZED', msg);
  }
  static forbidden(msg = 'Not allowed') {
    return new ApiException('FORBIDDEN', msg);
  }
  static notFound(msg = 'Not found') {
    return new ApiException('NOT_FOUND', msg);
  }
  static conflict(msg = 'Already exists') {
    return new ApiException('CONFLICT', msg);
  }
  static validation(msg = 'Validation failed', fields?: Record<string, string[]>) {
    return new ApiException('VALIDATION', msg, fields);
  }
}
