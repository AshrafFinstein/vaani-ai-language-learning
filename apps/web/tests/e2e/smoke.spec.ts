import { test, expect } from '@playwright/test';

// Smoke test — verifies the public landing page renders and routes to auth.
// Requires the web app running (see playwright.config.ts).
test('landing page loads and links to sign up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /get started/i }).first().click();
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
});

// TODO(later phase): full journey — register → select language → dashboard → AI chat →
// send message → receive response → complete practice → view feedback → check progress.
