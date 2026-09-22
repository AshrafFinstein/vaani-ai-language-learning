// Test environment defaults — set BEFORE any app module (which reads env) is imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://vaani:vaani@localhost:5433/vaani_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars-long';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.AI_PROVIDER ??= 'mock';
