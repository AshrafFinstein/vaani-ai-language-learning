import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. The full journey (register → onboarding → dashboard → chat → feedback →
 * progress) lands in a later phase; Phase 1 ships this config plus a landing smoke test.
 * Run with `npm run test:e2e --workspace @vaani/web` after starting the app (`npm run dev`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
