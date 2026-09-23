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
  // Chat model (real OpenAI path only; ignored by the mock).
  OPENAI_MODEL: z.string().optional(),
  // When true, transient OpenAI failures degrade to the deterministic Mock provider.
  AI_FALLBACK_TO_MOCK: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  // Speech provider selector; falls back to AI_PROVIDER when unset. 'mock' | 'openai'.
  SPEECH_PROVIDER: z.string().optional(),
  OPENAI_STT_MODEL: z.string().optional(),
  OPENAI_TTS_MODEL: z.string().optional(),
  OPENAI_TTS_VOICE: z.string().optional(),

  // ── Calendar (Meeting AI automation) ────────────────────────────────────────
  // Calendar backend selector. 'mock' (default, offline) | 'outlook' (real Graph).
  // Outlook activates ONLY when CALENDAR_PROVIDER=outlook AND MS_GRAPH_ACCESS_TOKEN
  // is set — otherwise the deterministic Mock is used, so the suite runs offline.
  CALENDAR_PROVIDER: z.string().default('mock'),
  // Microsoft Graph *delegated* bearer access token. Minting it (Azure AD/MSAL OAuth)
  // is out of scope; the Azure app registration + delegated Calendars.Read /
  // OnlineMeetings.Read consent is required to obtain it. NEVER commit a real token.
  MS_GRAPH_ACCESS_TOKEN: z.string().optional(),
  MS_GRAPH_BASE_URL: z.string().default('https://graph.microsoft.com/v1.0'),
  // Default reminder window (minutes before start) used when a user has no setting.
  MEETING_REMINDER_MINUTES: z.coerce.number().int().min(0).max(1440).default(10),
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
