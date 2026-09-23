import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { languageRouter } from './modules/language/language.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { practiceRouter } from './modules/practice/practice.routes.js';
import { meetingRouter } from './modules/meeting/meeting.routes.js';
import { characterRouter } from './modules/character/character.routes.js';
import { debateRouter } from './modules/debate/debate.routes.js';
import { photoRouter } from './modules/photo/photo.routes.js';
import { courseRouter } from './modules/course/course.routes.js';
import { flashcardRouter } from './modules/flashcard/flashcard.routes.js';
import { exploreRouter } from './modules/explore/explore.routes.js';
import { progressRouter } from './modules/progress/progress.routes.js';
import { speechRouter } from './modules/speech/speech.routes.js';
import { prisma } from './prisma.js';

export const apiRouter = Router();

// Liveness: the process is up and serving. Cheap, no dependencies — used by the
// container/orchestrator healthcheck.
apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

// Readiness: the app can serve traffic, including its database dependency. Returns
// 503 when the DB is unreachable so load balancers hold traffic until it recovers.
apiRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ready' } });
  } catch {
    res.status(503).json({ error: { code: 'INTERNAL', message: 'Not ready' } });
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/languages', languageRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/practice', practiceRouter);
apiRouter.use('/meetings', meetingRouter);
apiRouter.use('/characters', characterRouter);
apiRouter.use('/debates', debateRouter);
apiRouter.use('/photos', photoRouter);
apiRouter.use('/courses', courseRouter);
apiRouter.use('/flashcards', flashcardRouter);
apiRouter.use('/explore', exploreRouter);
apiRouter.use('/progress', progressRouter);
apiRouter.use('/speech', speechRouter);
