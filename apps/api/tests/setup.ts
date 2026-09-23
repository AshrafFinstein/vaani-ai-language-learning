// Test environment defaults — set BEFORE any app module (which reads env) is imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://vaani:vaani@localhost:5433/vaani_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars-long';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
// Force the offline mock providers so a real .env (openai keys, capture flags) can never
// leak into the hermetic suite. `??=` respects anything a specific test sets explicitly.
process.env.AI_PROVIDER ??= 'mock';
process.env.SPEECH_PROVIDER ??= 'mock';
process.env.MEETING_CAPTURE_GRAPH ??= 'false';
process.env.APIFY_ENABLED ??= 'false';
