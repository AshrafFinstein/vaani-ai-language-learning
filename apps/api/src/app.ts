import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins } from './env.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { apiRouter } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

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
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
