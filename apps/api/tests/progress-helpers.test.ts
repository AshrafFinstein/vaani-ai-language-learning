import { describe, expect, it } from 'vitest';
import type { ActivityKind } from '@prisma/client';
import {
  currentStreak,
  levelFromXp,
  longestStreak,
  minutesInTrailingWeek,
  minutesOnDay,
  sessionCounts,
  weeklySeries,
  type ActivityRow,
} from '../src/modules/progress/progress.helpers.js';

// Fixed reference "now" so every assertion is deterministic (no argument-less Date()).
const NOW = new Date(2026, 8, 22, 12, 0, 0); // 2026-09-22 (local)
const dayAt = (offset: number, kind: ActivityKind = 'CHAT', minutes = 5): ActivityRow => ({
  kind,
  minutes,
  xp: 0,
  createdAt: new Date(2026, 8, 22 + offset, 9, 0, 0),
});

describe('minutesOnDay', () => {
  it('sums only events on the same local day as now', () => {
    const events = [dayAt(0, 'CHAT', 5), dayAt(0, 'WORD', 3), dayAt(-1, 'CHAT', 10)];
    expect(minutesOnDay(events, NOW)).toBe(8);
  });

  it('returns 0 when there is no activity today', () => {
    expect(minutesOnDay([dayAt(-2, 'CHAT', 5)], NOW)).toBe(0);
  });
});

describe('minutesInTrailingWeek', () => {
  it('includes the trailing 7 days and excludes older events', () => {
    const events = [dayAt(0, 'CHAT', 4), dayAt(-6, 'CHAT', 6), dayAt(-7, 'CHAT', 99)];
    expect(minutesInTrailingWeek(events, NOW)).toBe(10);
  });
});

describe('weeklySeries', () => {
  it('produces 7 points ending today, with minutes bucketed by day', () => {
    const events = [dayAt(0, 'CHAT', 4), dayAt(-2, 'CHAT', 6)];
    const series = weeklySeries(events, NOW);
    expect(series).toHaveLength(7);
    // Last point is today.
    expect(series[6]!.minutes).toBe(4);
    expect(series[6]!.date).toBe('2026-09-22');
    // Two days ago has 6 minutes.
    expect(series[4]!.minutes).toBe(6);
    // A day with no activity is 0.
    expect(series[5]!.minutes).toBe(0);
  });
});

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const events = [dayAt(0), dayAt(-1), dayAt(-2)];
    expect(currentStreak(events, NOW)).toBe(3);
  });

  it('stays alive when the last activity was yesterday', () => {
    const events = [dayAt(-1), dayAt(-2)];
    expect(currentStreak(events, NOW)).toBe(2);
  });

  it('is 0 when the last activity is older than yesterday', () => {
    expect(currentStreak([dayAt(-3), dayAt(-4)], NOW)).toBe(0);
  });

  it('breaks the streak across a gap', () => {
    const events = [dayAt(0), dayAt(-1), dayAt(-3)];
    expect(currentStreak(events, NOW)).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the longest consecutive run anywhere', () => {
    const events = [dayAt(0), dayAt(-2), dayAt(-3), dayAt(-4)];
    expect(longestStreak(events)).toBe(3);
  });

  it('is 0 for no events', () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe('sessionCounts', () => {
  it('counts events by kind', () => {
    const events = [dayAt(0, 'CHAT'), dayAt(0, 'CHAT'), dayAt(0, 'DEBATE')];
    const counts = sessionCounts(events);
    expect(counts.chat).toBe(2);
    expect(counts.debate).toBe(1);
    expect(counts.word).toBe(0);
  });
});

describe('levelFromXp', () => {
  it('maps XP to a 1-based level with a next-level threshold', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(0).xpToNextLevel).toBe(100);
    expect(levelFromXp(150).level).toBe(2);
    expect(levelFromXp(1000).level).toBe(5);
  });

  it('reports 0 remaining XP at max level', () => {
    const info = levelFromXp(99_999);
    expect(info.xpToNextLevel).toBe(0);
  });
});
