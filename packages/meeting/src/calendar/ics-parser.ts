import type { CalendarEventDTO } from '@vaani/types';
import { teamsMeetingIdFromJoinUrl } from './teams-link.js';

/**
 * A focused, dependency-free iCalendar (RFC 5545) parser — just enough to turn a
 * published Outlook/Teams `.ics` feed into normalized {@link CalendarEventDTO}s. It is
 * deterministic and unit-tested against fixture strings (no network here — the URL
 * provider fetches the text and hands it to {@link parseIcs}).
 *
 * Deliberately NOT a full RFC 5545 implementation. Supported:
 *  - line UNFOLDING (continuation lines starting with a space/tab),
 *  - property PARAMETERS (`;TZID=…`, `;CN=…`, `;VALUE=DATE`),
 *  - DTSTART/DTEND as UTC (`…Z`), floating local, `VALUE=DATE` (all-day), and a small
 *    set of named time zones via {@link TZID_OFFSETS} (best-effort; unknown zones are
 *    treated as UTC and flagged in the returned event's `start`/`end` as-is),
 *  - Teams join-URL extraction from `X-MICROSOFT-SKYPETEAMSMEETINGURL`, `LOCATION`,
 *    `URL`, or a Teams link inside `DESCRIPTION`,
 *  - simple recurrence (`RRULE:FREQ=DAILY|WEEKLY`): the next occurrence within the
 *    queried window is included (see {@link expandOccurrences}).
 *
 * Recurring-event limitation (documented + tested): only FREQ=DAILY and FREQ=WEEKLY
 * with an optional INTERVAL/UNTIL/COUNT are expanded, and only occurrences whose START
 * falls inside the queried `[since, until]` window are emitted. BYDAY, monthly/yearly,
 * EXDATE and RDATE are NOT honoured — such events fall back to their base DTSTART only.
 */

/** A single unfolded `NAME;PARAM=VAL:VALUE` content line. */
interface IcsLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Minimal named-zone → fixed UTC-offset (minutes) table. Best-effort, DST-agnostic. */
const TZID_OFFSETS: Record<string, number> = {
  UTC: 0,
  'Etc/UTC': 0,
  'India Standard Time': 330,
  'Asia/Kolkata': 330,
  'Pacific Standard Time': -480,
  'America/Los_Angeles': -480,
  'Eastern Standard Time': -300,
  'America/New_York': -300,
  'GMT Standard Time': 0,
  'Europe/London': 0,
  'W. Europe Standard Time': 60,
  'Europe/Berlin': 60,
};

/** Unfolds RFC 5545 folded lines: a leading space/tab continues the previous line. */
function unfold(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[] = [];
  for (const line of normalized.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Unescapes RFC 5545 TEXT escaping (\n \, \; \\). */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** Parses a single content line into name, params, and (raw, still-escaped) value. */
function parseLine(line: string): IcsLine | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(';');
  const name = (parts[0] ?? '').toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, value, params };
}

/**
 * Parses an ICS date/time value into epoch ms.
 * - `…Z` → UTC. `VALUE=DATE` (yyyymmdd) → midnight in the given TZID (or UTC).
 * - Otherwise a floating `yyyymmddThhmmss`, offset by the TZID from {@link TZID_OFFSETS}.
 */
function parseIcsDate(value: string, params: Record<string, string>): number | null {
  const v = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v);

  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    const offsetMin = params.TZID ? (TZID_OFFSETS[params.TZID] ?? 0) : 0;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d)) - offsetMin * 60_000;
  }
  if (dateTime) {
    const [, y, mo, d, h, mi, s, z] = dateTime;
    const base = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    if (z === 'Z') return base;
    const offsetMin = params.TZID ? (TZID_OFFSETS[params.TZID] ?? 0) : 0;
    // A floating/zoned local time: subtract the zone offset to get UTC epoch ms.
    return base - offsetMin * 60_000;
  }
  return null;
}

/** A Teams meetup-join / meeting URL matcher (used across several properties). */
const TEAMS_URL_RE = /https:\/\/teams\.microsoft\.com\/l\/(?:meetup-join|meeting)\/[^\s"'>]+/i;

/** Extracts a Teams join URL from the assembled VEVENT properties (best-effort). */
function extractTeamsUrl(props: Record<string, string>): string | null {
  const direct = props['X-MICROSOFT-SKYPETEAMSMEETINGURL'];
  if (direct && TEAMS_URL_RE.test(direct)) return direct.match(TEAMS_URL_RE)![0];

  for (const key of ['LOCATION', 'URL', 'DESCRIPTION']) {
    const val = props[key];
    if (val) {
      const m = val.match(TEAMS_URL_RE);
      if (m) return m[0];
    }
  }
  return null;
}

/** Parses an `ORGANIZER` (or `ATTENDEE`) line into a name/email pair. */
function parsePerson(
  line: IcsLine | undefined,
): { name: string; email: string | null } | null {
  if (!line) return null;
  const email = line.value.replace(/^mailto:/i, '').trim() || null;
  const name = line.params.CN?.trim() || email || null;
  if (!name) return null;
  return { name, email };
}

/** A parsed VEVENT before window filtering / recurrence expansion. */
interface RawEvent {
  uid: string;
  title: string;
  startMs: number;
  endMs: number;
  joinUrl: string | null;
  teamsMeetingId: string | null;
  organizer: { name: string; email: string | null } | null;
  attendees: Array<{ name: string; email: string | null }>;
  rrule: string | null;
}

/** Extracts the raw VEVENT blocks (each a list of content lines) from unfolded ICS. */
function splitVevents(lines: string[]): IcsLine[][] {
  const events: IcsLine[][] = [];
  let current: IcsLine[] | null = null;
  for (const raw of lines) {
    const upper = raw.toUpperCase();
    if (upper === 'BEGIN:VEVENT') {
      current = [];
    } else if (upper === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const parsed = parseLine(raw);
      if (parsed) current.push(parsed);
    }
  }
  return events;
}

/** Builds a RawEvent from a VEVENT's content lines, or null when unusable. */
function toRawEvent(vevent: IcsLine[]): RawEvent | null {
  const first = (name: string): IcsLine | undefined => vevent.find((l) => l.name === name);
  const props: Record<string, string> = {};
  for (const l of vevent) if (!(l.name in props)) props[l.name] = unescapeText(l.value);

  const uidLine = first('UID');
  const dtStart = first('DTSTART');
  const dtEnd = first('DTEND');
  if (!uidLine?.value || !dtStart) return null;

  const startMs = parseIcsDate(dtStart.value, dtStart.params);
  if (startMs === null) return null;
  // DTEND is optional; default to a 30-minute block when absent (Outlook usually sends it).
  const endMs = dtEnd ? parseIcsDate(dtEnd.value, dtEnd.params) : startMs + 30 * 60_000;
  if (endMs === null) return null;

  const joinUrl = extractTeamsUrl(props);
  const organizer = parsePerson(first('ORGANIZER'));
  const attendees = vevent
    .filter((l) => l.name === 'ATTENDEE')
    .map((l) => parsePerson(l))
    .filter((p): p is { name: string; email: string | null } => p !== null);

  return {
    uid: uidLine.value.trim(),
    title: unescapeText(first('SUMMARY')?.value ?? '').trim() || 'Untitled meeting',
    startMs,
    endMs,
    joinUrl,
    teamsMeetingId: teamsMeetingIdFromJoinUrl(joinUrl),
    organizer,
    attendees,
    rrule: first('RRULE')?.value ?? null,
  };
}

/** Parses a `KEY=VALUE;KEY=VALUE` RRULE into a record. */
function parseRrule(rrule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rrule.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

/**
 * Expands a RawEvent into concrete start offsets (ms) that fall inside `[since, until]`.
 * Non-recurring events yield their base start (when in-window). DAILY/WEEKLY recurrence
 * is stepped forward by INTERVAL until it passes `until`, COUNT, or UNTIL — whichever is
 * first. Other frequencies fall back to the base occurrence only (documented limitation).
 */
function expandOccurrences(ev: RawEvent, since: number, until: number): number[] {
  const duration = ev.endMs - ev.startMs;
  if (!ev.rrule) {
    return ev.startMs >= since && ev.startMs <= until ? [ev.startMs] : [];
  }

  const rule = parseRrule(ev.rrule);
  const freq = (rule.FREQ ?? '').toUpperCase();
  const stepMs =
    freq === 'DAILY' ? 86_400_000 : freq === 'WEEKLY' ? 7 * 86_400_000 : 0;
  if (stepMs === 0) {
    // Unsupported frequency (monthly/yearly/etc.): include the base occurrence only.
    return ev.startMs >= since && ev.startMs <= until ? [ev.startMs] : [];
  }

  const interval = Math.max(1, Number(rule.INTERVAL ?? '1') || 1);
  const untilCap = rule.UNTIL ? (parseIcsDate(rule.UNTIL, {}) ?? until) : until;
  const countCap = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const hardCeiling = Math.min(until, untilCap);

  const out: number[] = [];
  let occ = ev.startMs;
  let emitted = 0;
  // Bounded loop: a WEEKLY step over any sane window terminates quickly; guard anyway.
  for (let guard = 0; guard < 1000 && occ <= hardCeiling && emitted < countCap; guard++) {
    if (occ >= since && occ + duration >= occ) out.push(occ);
    occ += stepMs * interval;
    emitted++;
  }
  return out;
}

/**
 * Parses raw ICS content into normalized events within `[sinceIso, untilIso]`.
 * `now`/window bounds are the caller's — this function never reads the wall clock.
 */
export function parseIcs(
  content: string,
  sinceIso: string,
  untilIso: string,
): CalendarEventDTO[] {
  const since = new Date(sinceIso).getTime();
  const until = new Date(untilIso).getTime();
  if (Number.isNaN(since) || Number.isNaN(until)) return [];

  const rawEvents = splitVevents(unfold(content))
    .map(toRawEvent)
    .filter((e): e is RawEvent => e !== null);

  const events: CalendarEventDTO[] = [];
  for (const ev of rawEvents) {
    const duration = ev.endMs - ev.startMs;
    for (const startMs of expandOccurrences(ev, since, until)) {
      const isRecurringOccurrence = startMs !== ev.startMs;
      events.push({
        // A recurring occurrence gets a stable, occurrence-specific id so sync stays
        // idempotent yet distinct per instance.
        externalCalendarId: isRecurringOccurrence ? `${ev.uid}_${startMs}` : ev.uid,
        title: ev.title,
        start: new Date(startMs).toISOString(),
        end: new Date(startMs + duration).toISOString(),
        joinUrl: ev.joinUrl,
        teamsMeetingId: ev.teamsMeetingId,
        organizer: ev.organizer,
        attendees: ev.attendees,
      });
    }
  }
  // Deterministic ordering by start then id (stable for idempotent sync + tests).
  events.sort(
    (a, b) =>
      a.start.localeCompare(b.start) || a.externalCalendarId.localeCompare(b.externalCalendarId),
  );
  return events;
}
