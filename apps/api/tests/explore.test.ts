import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * In-memory Prisma mock for the explore service. It reads existing content (characters,
 * courses, system flashcard decks); scenarios come from @vaani/types (static). The picks
 * are deterministic per date, so a fixed `?date=` yields a stable payload.
 */
vi.mock('../src/prisma.js', () => {
  const prisma = {
    aICharacter: {
      findMany: async () => [
        { key: 'barista', name: 'Mika the Barista', tagline: 'a cheerful barista', avatarEmoji: '☕' },
        { key: 'interviewer', name: 'Ms. Okafor', tagline: 'a job interviewer', avatarEmoji: '💼' },
        { key: 'guide', name: 'Leo the Guide', tagline: 'a travel guide', avatarEmoji: '🗺️' },
      ],
    },
    course: {
      findMany: async () => [
        { slug: 'spanish-foundations', title: 'Spanish Foundations', description: 'Basics.', coverEmoji: '🇪🇸' },
      ],
    },
    flashcardDeck: {
      findMany: async () => [
        { id: 'deck_1', title: 'Travel Essentials', description: 'Travel words.' },
      ],
    },
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

describe('GET /api/explore', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/explore?date=2026-09-22');
    expect(res.status).toBe(401);
  });

  it('returns the expected daily-picks shape', async () => {
    const res = await request(app).get('/api/explore?date=2026-09-22').set('Cookie', COOKIE);
    expect(res.status).toBe(200);

    const payload = res.body.data;
    expect(payload.date).toBe('2026-09-22');
    expect(typeof payload.intro).toBe('string');

    // A highlighted pick with a route into an existing mode.
    expect(payload.highlight).toMatchObject({ title: expect.any(String), to: expect.any(String) });
    expect(payload.highlight.to).toMatch(/^\/app\//);

    // Grouped sections referencing existing content by key/slug/id.
    expect(Array.isArray(payload.sections)).toBe(true);
    const keys = payload.sections.map((s: { key: string }) => s.key);
    expect(keys).toContain('scenarios');
    expect(keys).toContain('characters');

    const scenarioSection = payload.sections.find((s: { key: string }) => s.key === 'scenarios');
    expect(scenarioSection.picks.length).toBeGreaterThan(0);
    expect(scenarioSection.picks[0].to).toMatch(/^\/app\/roleplay\//);
  });

  it('is deterministic for the same date', async () => {
    const a = await request(app).get('/api/explore?date=2026-09-22').set('Cookie', COOKIE);
    const b = await request(app).get('/api/explore?date=2026-09-22').set('Cookie', COOKIE);
    expect(a.body).toEqual(b.body);
  });

  it('varies picks across different dates', async () => {
    const a = await request(app).get('/api/explore?date=2026-09-22').set('Cookie', COOKIE);
    const b = await request(app).get('/api/explore?date=2026-12-25').set('Cookie', COOKIE);
    // The seeded rotation should differ for sufficiently different dates.
    expect(a.body.data.highlight).not.toEqual(b.body.data.highlight);
  });
});
