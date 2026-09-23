import type { NextFunction, Request, Response } from 'express';
import { isProd } from '../env.js';

/**
 * Minimal structured request logger (no dependency). Emits one line per completed
 * request with method, path, status, and duration. In production it emits JSON
 * (friendly to log collectors); in dev it emits a compact human-readable line.
 *
 * It deliberately logs only the request line + status — never bodies, cookies,
 * tokens, or query secrets — so nothing sensitive lands in logs (CLAUDE.md §10).
 * Health/readiness probes are skipped to keep logs signal-rich.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/api/health' || req.path === '/api/ready') {
    next();
    return;
  }
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    };
    if (isProd) {
      console.log(JSON.stringify(entry));
    } else {
      console.log(
        `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms`,
      );
    }
  });
  next();
}
