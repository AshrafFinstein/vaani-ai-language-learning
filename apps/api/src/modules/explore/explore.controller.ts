import type { Request, Response } from 'express';
import { ApiException } from '../../lib/errors.js';
import { exploreService } from './explore.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

/** Today's date as YYYY-MM-DD (UTC). Only used when the caller omits `?date=`. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const exploreController = {
  async daily(req: Request, res: Response): Promise<void> {
    // Auth-protected: ensure a valid session even though picks aren't user-specific.
    userId(req);
    // Deterministic: the picks are seeded by the date the caller passes; we only fall back
    // to "today" when no date is supplied (a path not exercised by tests).
    const date =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : todayUtc();
    const payload = await exploreService.getDailyPicks(date);
    res.status(200).json({ data: payload });
  },
};
