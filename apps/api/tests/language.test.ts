import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/prisma.js', () => {
  const languages = [
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flagEmoji: '🇫🇷',
      rtl: false,
      isActive: true,
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flagEmoji: '🇸🇦',
      rtl: true,
      isActive: true,
    },
    {
      code: 'xx',
      name: 'Hidden',
      nativeName: 'Hidden',
      flagEmoji: null,
      rtl: false,
      isActive: false,
    },
  ];
  return {
    prisma: {
      language: {
        findMany: async ({ where }: { where: { isActive: boolean } }) =>
          languages
            .filter((l) => l.isActive === where.isActive)
            .sort((a, b) => a.name.localeCompare(b.name)),
      },
    },
  };
});

const { createApp } = await import('../src/app.js');
const app = createApp();

describe('GET /api/languages', () => {
  it('lists active languages alphabetically as DTOs', async () => {
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', flagEmoji: '🇸🇦', rtl: true },
      { code: 'fr', name: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', rtl: false },
    ]);
  });
});
