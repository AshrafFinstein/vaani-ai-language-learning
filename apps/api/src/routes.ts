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

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
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
