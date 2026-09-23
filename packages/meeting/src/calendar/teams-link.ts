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
 * Matches both the plain `19:meeting_…@thread.v2` form and the URL-encoded
 * `19%3ameeting_…%40thread.v2` form, so it works for `/l/chat/`, `/l/meetup-join/`, and
 * `/l/meeting/` links alike. Returns the decoded id, or null when none is present.
 */
export function teamsMeetingIdFromJoinUrl(joinUrl: string | null): string | null {
  if (!joinUrl) return null;
  const match = joinUrl.match(/19%3ameeting_[^%/]+%40thread\.v2|19:meeting_[^/]+@thread\.v2/i);
  return match ? decodeURIComponent(match[0]) : null;
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
