/**
 * Shared, dependency-free Teams-link helpers. This is the SINGLE source of truth for
 * deriving a Teams meeting/thread id from a join URL — reused by both the ICS parser
 * ({@link ./ics-parser}) and the manual "paste a Teams link" schedule path, so there is
 * exactly one regex to reason about.
 *
 * The id is only ever DERIVED from the URL — never invented. When a URL is not a Teams
 * meeting link (or carries no thread id), {@link teamsMeetingIdFromJoinUrl} returns null.
 */

/**
 * Derives the Teams thread id from a join URL when present (never invented).
 *
 * Recognizes two link families:
 *  1. Classic thread links (`/l/chat/`, `/l/meetup-join/`, `/l/meeting/`) carrying a
 *     `19:meeting_…@thread.v2` id — in plain, URL-encoded (`19%3ameeting_…%40thread.v2`),
 *     or mixed form. Returns the canonical `19:meeting_…@thread.v2`.
 *  2. Newer short "meet" links (`teams.microsoft.com/meet/<code>?p=<passcode>`). Returns the
 *     numeric meeting code (the `?p=` passcode is a secret and is NEVER part of the id).
 *
 * The id is only ever derived from the URL, never invented; returns null otherwise.
 */
export function teamsMeetingIdFromJoinUrl(joinUrl: string | null): string | null {
  if (!joinUrl) return null;
  // 1. Classic thread id — 19(:|%3a) meeting_<id> (@|%40) thread.v2 (lazy body).
  const thread = joinUrl.match(/19(?:%3a|:)meeting_[^/?#\s]+?(?:%40|@)thread\.v2/i);
  if (thread) return thread[0].replace(/%3a/gi, ':').replace(/%40/gi, '@');
  // 2. Short "meet" link — teams.microsoft.com/meet/<numeric code> (ignore the ?p passcode).
  const meet = joinUrl.match(/teams\.microsoft\.com\/meet\/(\d+)/i);
  if (meet) return meet[1] ?? null;
  return null;
}

/** The result of parsing a pasted Teams link: the URL passthrough + derived id. */
export interface ParsedTeamsLink {
  /** The join URL as supplied (passed through unchanged). */
  joinUrl: string;
  /** The derived Teams thread id, or null when the URL is not a Teams meeting link. */
  teamsMeetingId: string | null;
}

/**
 * Parses a pasted Teams meeting link into its join URL + derived meeting id. The URL is
 * passed through unchanged (Vaani never rewrites it); only the id is extracted, and only
 * when the URL actually contains a Teams thread id (otherwise `teamsMeetingId` is null).
 */
export function parseTeamsLink(url: string): ParsedTeamsLink {
  return { joinUrl: url, teamsMeetingId: teamsMeetingIdFromJoinUrl(url) };
}
