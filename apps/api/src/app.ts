import express, { type Express, type Request } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins } from './env.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { requestLogger } from './middleware/request-logger.js';
import { apiRouter } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

/** Endpoints that accept base64 audio and need a larger JSON body limit. */
function isAudioBodyRoute(req: Request): boolean {
  return (
    req.path === '/api/speech/transcribe' ||
    /^\/api\/meetings\/[^/]+\/transcribe$/.test(req.path)
  );
}

/** Builds the Express app. Exported (without listening) so tests can import it. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  // Larger JSON limit only for audio-bearing routes (base64 audio); 1mb everywhere else.
  const audioJson = express.json({ limit: '25mb' });
  const standardJson = express.json({ limit: '1mb' });
  app.use((req, res, next) =>
    isAudioBodyRoute(req) ? audioJson(req, res, next) : standardJson(req, res, next),
  );
  app.use(cookieParser());

  // Structured request logging (skipped under test to keep the suite output clean).
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
