import { z } from 'zod';

/**
 * Canonical API error codes. The HTTP status is derived from these on the server
 * and surfaced to the client so it can render useful, specific messages.
 */
export const ApiErrorCode = z.enum([
  'BAD_REQUEST', // 400
  'UNAUTHORIZED', // 401
  'FORBIDDEN', // 403
  'NOT_FOUND', // 404
  'CONFLICT', // 409
  'VALIDATION', // 422
  'RATE_LIMITED', // 429
  'INTERNAL', // 500
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCode,
  message: z.string(),
  /** Optional field-level validation issues, keyed by field path. */
  fields: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Discriminated success/error envelope returned by every endpoint. */
export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: ApiError };

export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};
