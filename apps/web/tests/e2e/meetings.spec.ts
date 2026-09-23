import { test, expect, type Page } from '@playwright/test';

/**
 * E2E coverage for the Meetings flow. Like `smoke.spec.ts`, this is NOT part of the
 * offline unit gate (`npm run test`) — it needs the full stack running:
 *
 *   1. Postgres:            npm run db:up   (then `npm run db:deploy`)
 *   2. API + web (dev):     npm run dev     (API on :4000, web on :5173)
 *   3. E2E:                 npm run e2e
 *
 * The Mock AI/transcript providers keep the analysis deterministic and offline
 * (no OpenAI key needed). Each test registers its own fresh user so the specs are
 * independent and repeatable against a persistent DB.
 */

const PASSWORD = 'Vaani1234';

/** Registers a fresh user and lands in the authenticated app (mirrors smoke.spec.ts). */
async function registerFreshUser(page: Page): Promise<string> {
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@vaani.test`;
  await page.goto('/register');
  await page.getByLabel(/name/i).fill('E2E Meetings');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/app(\/dashboard)?/, { timeout: 15_000 });
  return email;
}

/**
 * Fills the ScheduleForm and submits. On success the app navigates to the new
 * meeting's detail page (`/app/meetings/:id`). Returns the meeting id from the URL.
 */
async function scheduleMeeting(
  page: Page,
  opts: { title: string; joinUrl?: string; transcription?: boolean },
): Promise<string> {
  await page.goto('/app/meetings/schedule');
  await expect(page.getByRole('heading', { name: /schedule a meeting/i })).toBeVisible();

  // Title + date/time. Labels come straight from ScheduleForm.tsx.
  await page.getByLabel('Title').fill(opts.title);
  await page.getByLabel('Date').fill('2026-10-01');
  await page.getByLabel('Start time').fill('10:00');
  await page.getByLabel('End time').fill('11:00');

  if (opts.joinUrl) {
    await page.getByLabel(/teams meeting link/i).fill(opts.joinUrl);
  }

  if (opts.transcription) {
    // "Enable transcription" toggle — required before a transcript upload is allowed.
    await page.getByLabel(/enable transcription/i).check();
  }

  await page.getByRole('button', { name: /^schedule meeting$/i }).click();

  // Navigates to the detail page on success.
  await expect(page).toHaveURL(/\/app\/meetings\/[a-z0-9]+$/i, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: opts.title })).toBeVisible({ timeout: 15_000 });

  const url = new URL(page.url());
  return url.pathname.split('/').pop() as string;
}

// ── 1. Schedule a meeting with a pasted Teams link (PRIMARY) ──────────────────
test('schedule a meeting with a pasted Teams link and see it persist', async ({ page }) => {
  await registerFreshUser(page);

  // Fully-plain Teams meetup-join form; the server derives the `19:meeting_..@thread.v2`
  // id from it (parseTeamsLink). The id is stored server-side but not surfaced in the UI,
  // so we assert on the UI-visible outcome: the meeting is created and persists.
  const joinUrl =
    'https://teams.microsoft.com/l/meetup-join/19:meeting_ZDcwM2Ix@thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d';
  const title = `Sprint planning ${Date.now()}`;

  const id = await scheduleMeeting(page, { title, joinUrl });

  // The detail page renders the meeting (provider row + participants card).
  await expect(page.getByText(/microsoft teams|teams/i).first()).toBeVisible();

  // It appears in the Meetings list and links back to this detail page.
  await page.goto('/app/meetings');
  await expect(page.getByRole('heading', { name: /^meetings$/i })).toBeVisible();
  const listLink = page.locator(`a[href="/app/meetings/${id}"]`);
  await expect(listLink).toBeVisible({ timeout: 10_000 });
  await expect(listLink.getByText(title)).toBeVisible();

  // Re-open from the list → detail renders again (round-trip persistence).
  await listLink.click();
  await expect(page).toHaveURL(new RegExp(`/app/meetings/${id}$`));
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});

// ── 2. Upload a transcript → analysis (drives consent via the UI) ─────────────
test('grant consent, upload a transcript, and see the analysis render', async ({ page }) => {
  await registerFreshUser(page);

  const title = `Retro ${Date.now()}`;
  // Transcription must be enabled at schedule time (gates the upload control), AND a
  // recording session must grant transcript consent (server enforces both).
  await scheduleMeeting(page, { title, transcription: true });

  // Recording tab → grant recording + transcript consent → start recording. Starting a
  // recording is what persists `transcriptConsent=true` on the session, satisfying the
  // server-side gate in ingestProvidedTranscript.
  await page.getByRole('button', { name: /^recording$/i }).click();
  await page.getByLabel(/all participants consent to this meeting being recorded/i).check();
  await page.getByLabel(/also consent to transcription/i).check();
  await page.getByRole('button', { name: /start recording/i }).click();

  // Once the session starts, the consent form is replaced by the active controls —
  // the "Stop" button only exists while recording is live. This is an unambiguous
  // signal that transcriptConsent was persisted server-side.
  await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible({ timeout: 10_000 });

  // Provide a small Teams-style .vtt transcript via the file input. The <input type=file>
  // is hidden-styled but present; setInputFiles works on it directly.
  const vtt = [
    'WEBVTT',
    '',
    '00:00:00.000 --> 00:00:06.000',
    '<v Speaker 1>Welcome everyone. Today we review the onboarding revamp.',
    '',
    '00:00:06.000 --> 00:00:12.000',
    '<v Speaker 1>We decided to ship the new flow next week and assign the QA pass to the team.',
  ].join('\n');

  await page.locator('#upload-transcript').setInputFiles({
    name: 'meeting.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from(vtt, 'utf-8'),
  });

  // Upload success surfaces an inline confirmation.
  await expect(page.getByText(/transcript ingested/i)).toBeVisible({ timeout: 20_000 });

  // Switch to the Analysis tab — with Mock providers the analysis is deterministic and
  // COMPLETED, so the summary/action-item sections render. The section titles are
  // styled <div>s (CardTitle), not semantic headings, so we match on visible text.
  await page.getByRole('button', { name: /^analysis$/i }).click();
  // Scope to the main content region ("Overview" also appears as a sidebar nav group).
  const main = page.getByRole('main');
  await expect(main.getByText('Overview', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(main.getByText('Action items', { exact: true })).toBeVisible();
});

// ── 3. Meeting detail renders the upload + consent UI without error ───────────
// A lightweight guard that the upload/consent surface renders even before consent is
// granted (the transcript input is disabled until transcription is enabled + consent).
test('meeting detail renders the recording, upload, and privacy controls', async ({ page }) => {
  await registerFreshUser(page);

  const title = `Standup ${Date.now()}`;
  await scheduleMeeting(page, { title });

  // Recording tab shows the consent checkboxes + the upload card. CardTitles are styled
  // <div>s, not semantic headings, so match on visible text.
  await page.getByRole('button', { name: /^recording$/i }).click();
  await expect(
    page.getByLabel(/all participants consent to this meeting being recorded/i),
  ).toBeVisible();
  await expect(page.getByText('Provide a recording or transcript', { exact: true })).toBeVisible();
  // Transcription was not enabled at schedule → the upload is gated and the warning shows.
  await expect(page.getByText(/transcription is disabled for this meeting/i)).toBeVisible();

  // Privacy tab renders the consent/retention settings.
  await page.getByRole('button', { name: /^privacy$/i }).click();
  await expect(page.getByText(/consent .* recording defaults/i)).toBeVisible();
});
