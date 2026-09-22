import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load the repository-root .env regardless of which workspace cwd we run from.
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [resolve(here, '../../../.env'), resolve(process.cwd(), '.env')] });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  AI_PROVIDER: z.string().default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a clear message rather than crashing deep inside a request.
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

/** Origins allowed by CORS (comma-separated in CORS_ORIGIN). */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
