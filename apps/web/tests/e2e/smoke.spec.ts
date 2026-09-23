import { test, expect } from '@playwright/test';

/**
 * E2E happy-path. This is NOT part of the offline unit gate (`npm run test`); it needs
 * the full stack running:
 *
 *   1. Postgres:            npm run db:up   (then `npm run db:migrate` / `db:deploy`)
 *   2. API + web (dev):     npm run dev     (API on :4000, web on :5173)
 *   3. E2E:                 npm run e2e
 *
 * Override the target with E2E_BASE_URL. The Mock AI/speech providers keep it
 * deterministic and offline (no OpenAI key needed).
 */

// ── Public smoke ──────────────────────────────────────────────────────────────
test('landing page loads and links to sign up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /get started/i }).first().click();
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
});

// ── Full happy-path: register → dashboard → open a couple of built features ────
test('new user can register, reach the dashboard, and open features', async ({ page }) => {
  // A unique email per run so the test is repeatable against a persistent DB.
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@vaani.test`;
  const password = 'Vaani1234';

  await page.goto('/register');
  await page.getByLabel(/name/i).fill('E2E Tester');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  // Registration logs the user in and lands them in the authenticated app.
  await expect(page).toHaveURL(/\/app(\/dashboard)?/, { timeout: 15_000 });

  // Dashboard renders.
  await page.goto('/app/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Open a couple of built features — routes should render without crashing.
  await page.goto('/app/courses');
  await expect(page).toHaveURL(/\/app\/courses/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/app/flashcards');
  await expect(page).toHaveURL(/\/app\/flashcards/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/app/progress');
  await expect(page).toHaveURL(/\/app\/progress/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('login rejects bad credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('nobody@vaani.test');
  await page.getByLabel(/password/i).fill('WrongPass123');
  await page.getByRole('button', { name: /log in/i }).click();
  // Stays on the login page and surfaces an error rather than authenticating.
  await expect(page).toHaveURL(/\/login/);
});
