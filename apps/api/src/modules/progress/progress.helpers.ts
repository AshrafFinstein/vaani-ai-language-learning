import type { ActivityKind } from '@prisma/client';
import type { LearningLevel, SessionCountsDTO, WeeklyPointDTO } from '@vaani/types';

/**
 * Pure, deterministic aggregation helpers for the Progress module. Every function that
 * depends on the current time takes `now` as an argument so tests are reproducible and
 * never call an argument-less `new Date()` in an exercised path.
 */

export interface ActivityRow {
  kind: ActivityKind;
  minutes: number;
  xp: number;
  createdAt: Date;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The learner-day key (YYYY-MM-DD) for a date, in the server's local zone. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Midnight (local) at the start of `d`. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Adds `n` whole days to `d` (local). */
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Sum of minutes recorded on the same local day as `now`. */
export function minutesOnDay(events: ActivityRow[], now: Date): number {
  const key = dayKey(now);
  return events.reduce((sum, e) => (dayKey(e.createdAt) === key ? sum + e.minutes : sum), 0);
}

/** Sum of minutes recorded in the trailing 7 local days (including today). */
export function minutesInTrailingWeek(events: ActivityRow[], now: Date): number {
  const cutoff = addDays(startOfDay(now), -6);
  return events.reduce((sum, e) => (e.createdAt >= cutoff ? sum + e.minutes : sum), 0);
}

/**
 * The trailing 7-day minutes series (oldest → newest, today last). Each point carries a
 * short weekday label and the ISO date it represents.
 */
export function weeklySeries(events: ActivityRow[], now: Date): WeeklyPointDTO[] {
  const today = startOfDay(now);
  const buckets = new Map<string, number>();
  for (const e of events) {
    const k = dayKey(e.createdAt);
    buckets.set(k, (buckets.get(k) ?? 0) + e.minutes);
  }
  const series: WeeklyPointDTO[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = dayKey(d);
    series.push({
      day: WEEKDAY_LABELS[d.getDay()]!,
      date: key,
      minutes: buckets.get(key) ?? 0,
    });
  }
  return series;
}

/**
 * The current consecutive-day streak ending today or yesterday. A day counts if it has
 * any recorded activity. The streak is still "alive" if the learner practiced yesterday
 * but not yet today (so it doesn't reset before the day ends).
 */
export function currentStreak(events: ActivityRow[], now: Date): number {
  const days = new Set(events.map((e) => dayKey(e.createdAt)));
  const today = startOfDay(now);
  // Anchor: today if active today, else yesterday if active then, else 0.
  let anchor: Date;
  if (days.has(dayKey(today))) {
    anchor = today;
  } else if (days.has(dayKey(addDays(today, -1)))) {
    anchor = addDays(today, -1);
  } else {
    return 0;
  }
  let streak = 0;
  let cursor = anchor;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest consecutive-day streak anywhere in the history. */
export function longestStreak(events: ActivityRow[]): number {
  const keys = [...new Set(events.map((e) => dayKey(e.createdAt)))].sort();
  if (keys.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(`${keys[i - 1]}T00:00:00`);
    const cur = new Date(`${keys[i]}T00:00:00`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Empty session-count map with every kind at 0. */
export function emptySessionCounts(): SessionCountsDTO {
  return {
    chat: 0,
    roleplay: 0,
    call: 0,
    dialogue: 0,
    word: 0,
    sentence: 0,
    flashcard: 0,
    course: 0,
    debate: 0,
    photo: 0,
    character: 0,
    scenario: 0,
    meeting: 0,
  };
}

const KIND_TO_FIELD: Record<ActivityKind, keyof SessionCountsDTO> = {
  CHAT: 'chat',
  ROLEPLAY: 'roleplay',
  CALL: 'call',
  DIALOGUE: 'dialogue',
  WORD: 'word',
  SENTENCE: 'sentence',
  FLASHCARD: 'flashcard',
  COURSE: 'course',
  DEBATE: 'debate',
  PHOTO: 'photo',
  CHARACTER: 'character',
  SCENARIO: 'scenario',
  MEETING: 'meeting',
};

/** Counts events by kind into the session-count shape. */
export function sessionCounts(events: ActivityRow[]): SessionCountsDTO {
  const counts = emptySessionCounts();
  for (const e of events) {
    const field = KIND_TO_FIELD[e.kind];
    counts[field] += 1;
  }
  return counts;
}

/** Total XP across events. */
export function totalXp(events: ActivityRow[]): number {
  return events.reduce((sum, e) => sum + e.xp, 0);
}

/**
 * XP thresholds per level (cumulative). Level 1 starts at 0 XP; each subsequent level
 * requires progressively more XP. Deliberately small and deterministic.
 */
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200];
const LEVEL_LABELS = [
  'Newcomer',
  'Beginner (A1)',
  'Elementary (A2)',
  'Pre-Intermediate (A2+)',
  'Intermediate (B1)',
  'Upper-Intermediate (B2)',
  'Advanced (C1)',
  'Proficient (C1+)',
  'Expert (C2)',
  'Master (C2+)',
];

export interface LevelInfo {
  level: number;
  levelLabel: string;
  xpToNextLevel: number;
}

/** Derives a 1-based level, its label, and XP remaining to the next level from total XP. */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  const isMax = level >= LEVEL_THRESHOLDS.length;
  const nextThreshold = isMax ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]! : LEVEL_THRESHOLDS[level]!;
  return {
    level,
    levelLabel: LEVEL_LABELS[level - 1] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1]!,
    xpToNextLevel: isMax ? 0 : Math.max(0, nextThreshold - xp),
  };
}

/** Maps the learner's profile level enum to the top activities list ordering (unused externally). */
export const LEARNING_LEVELS: LearningLevel[] = [
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'UPPER_INTERMEDIATE',
  'ADVANCED',
];

/** The activity kinds the learner used most (by count), most-frequent first. */
export function topActivityKinds(counts: SessionCountsDTO): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}
