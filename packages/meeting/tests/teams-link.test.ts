import { describe, expect, it } from 'vitest';
import { parseTeamsLink } from '../src/index.js';

describe('parseTeamsLink — derives the Teams meeting id from a pasted join URL', () => {
  it('extracts the id from a /l/chat/…@thread.v2 link (the AVD copy-paste case)', () => {
    const url =
      'https://teams.microsoft.com/l/chat/19:meeting_ZDcwABC123@thread.v2/conversations?ctx=chat';
    expect(parseTeamsLink(url)).toEqual({
      joinUrl: url,
      teamsMeetingId: '19:meeting_ZDcwABC123@thread.v2',
    });
  });

  it('extracts the id from a /l/meetup-join link', () => {
    const url = 'https://teams.microsoft.com/l/meetup-join/19:meeting_abc@thread.v2';
    expect(parseTeamsLink(url)).toEqual({
      joinUrl: url,
      teamsMeetingId: '19:meeting_abc@thread.v2',
    });
  });

  it('decodes the URL-encoded 19%3ameeting_…%40thread.v2 form', () => {
    const url =
      'https://teams.microsoft.com/l/meetup-join/19%3ameeting_Zmed%40thread.v2/0?context=%7b%7d';
    expect(parseTeamsLink(url)).toEqual({
      joinUrl: url,
      teamsMeetingId: '19:meeting_Zmed@thread.v2',
    });
  });

  it('returns a null id (join URL passthrough) for a non-Teams URL', () => {
    const url = 'https://example.com/some/other/link';
    expect(parseTeamsLink(url)).toEqual({ joinUrl: url, teamsMeetingId: null });
  });
});
