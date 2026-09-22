import type { Request, Response } from 'express';
import type { ChatStreamEvent, SendMessageInput, StartConversationInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';
import { chatService } from './chat.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const chatController = {
  async history(req: Request, res: Response): Promise<void> {
    const conversations = await chatService.listConversations(userId(req));
    res.status(200).json({ data: { conversations } });
  },

  async start(req: Request, res: Response): Promise<void> {
    const conversation = await chatService.startConversation(
      userId(req),
      req.body as StartConversationInput,
    );
    res.status(201).json({ data: { conversation } });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const conversation = await chatService.getConversationDetail(userId(req), req.params.id!);
    res.status(200).json({ data: { conversation } });
  },

  async send(req: Request, res: Response): Promise<void> {
    const { content } = req.body as SendMessageInput;
    const result = await chatService.reply(userId(req), req.params.id!, content);
    res.status(201).json({ data: result });
  },

  async feedback(req: Request, res: Response): Promise<void> {
    const feedback = await chatService.feedback(userId(req), req.params.id!);
    res.status(200).json({ data: { feedback } });
  },

  /** Streams the AI reply as Server-Sent Events, persisting messages around the stream. */
  async stream(req: Request, res: Response): Promise<void> {
    const uid = userId(req);
    const conversationId = req.params.id!;
    const { content } = req.body as SendMessageInput;

    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const write = (event: ChatStreamEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      const { userMessage, messages, options } = await chatService.beginStream(
        uid,
        conversationId,
        content,
      );
      write({ type: 'meta', conversationId, userMessageId: userMessage.id });

      let full = '';
      for await (const delta of getAIProvider().streamChat(messages, options)) {
        full += delta;
        write({ type: 'delta', text: delta });
      }

      const assistant = await chatService.finishStream(conversationId, full);
      write({ type: 'done', assistantMessageId: assistant.id });
    } catch (err) {
      const message = err instanceof ApiException ? err.message : 'Streaming failed';
      write({ type: 'error', message });
    } finally {
      res.end();
    }
  },
};
