import { describe, expect, it } from 'vitest';
import { LocalAudioCaptureProvider, createCaptureProvider } from '../src/index.js';

describe('LocalAudioCaptureProvider — consent-gated, state-only (CLAUDE.md §13–14)', () => {
  it('reports real capture as unsupported (deferred in this environment)', () => {
    const cap = new LocalAudioCaptureProvider().capability();
    expect(cap.audioSupported).toBe(false);
    expect(cap.reason).toMatch(/deferred/i);
  });

  it('REFUSES to start without explicit consent (never covert)', async () => {
    const provider = new LocalAudioCaptureProvider();
    const res = await provider.start({ meetingId: 'm1', consent: false });
    expect(res.started).toBe(false);
    expect(res.state).toBe('IDLE');
    expect(res.message).toMatch(/consent/i);
  });

  it('enters CAPTURING state with consent but records no real audio (started=false)', async () => {
    const provider = new LocalAudioCaptureProvider();
    const res = await provider.start({ meetingId: 'm1', consent: true });
    expect(res.state).toBe('CAPTURING');
    // Real capture is deferred → nothing is actually recorded.
    expect(res.started).toBe(false);
  });

  it('stops to STOPPED with no fabricated duration', async () => {
    const provider = new LocalAudioCaptureProvider();
    await provider.start({ meetingId: 'm1', consent: true });
    const res = await provider.stop('m1');
    expect(res.state).toBe('STOPPED');
    expect(res.durationSeconds).toBe(0);
  });

  it('factory returns the local-audio provider (no Graph capture provider exists)', () => {
    expect(createCaptureProvider().name).toBe('local-audio');
  });
});
