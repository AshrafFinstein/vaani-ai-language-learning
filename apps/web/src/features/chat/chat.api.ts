import type {
  AIFeedback,
  ChatStreamEvent,
  ConversationDetailDTO,
  ConversationDTO,
  ConversationSummaryDTO,
  SendMessageInput,
  StartConversationInput,
} from '@vaani/types';
import { api, ApiClientError } from '@/lib/api';

export const chatApi = {
  history: () =>
    api.get<{ conversations: ConversationSummaryDTO[] }>('/api/chat/history'),
  start: (input: StartConversationInput) =>
    api.post<{ conversation: ConversationDTO }>('/api/chat', input),
  detail: (id: string) =>
    api.get<{ conversation: ConversationDetailDTO }>(`/api/chat/${id}`),
  send: (id: string, input: SendMessageInput) =>
    api.post<{ userMessage: unknown; assistantMessage: unknown }>(`/api/chat/${id}/messages`, input),
  feedback: (id: string) => api.post<{ feedback: AIFeedback }>(`/api/chat/${id}/feedback`),
};

export interface StreamHandlers {
  onMeta?: (e: { conversationId: string; userMessageId: string }) => void;
  onDelta?: (text: string) => void;
  onDone?: (assistantMessageId: string) => void;
  onError?: (message: string) => void;
}

/**
 * Streams an AI reply over SSE. Reads the fetch response body directly and parses
 * `data: {json}` frames into {@link ChatStreamEvent}s. Returns an abort function.
 */
export async function streamChatMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/chat/${conversationId}/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch {
    handlers.onError?.('Network error. Please try again.');
    return;
  }

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    const err: ApiClientError | undefined = body?.error
      ? new ApiClientError(res.status, body.error)
      : undefined;
    handlers.onError?.(err?.message ?? 'Could not start the reply.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as ChatStreamEvent;
        switch (event.type) {
          case 'meta':
            handlers.onMeta?.({ conversationId: event.conversationId, userMessageId: event.userMessageId });
            break;
          case 'delta':
            handlers.onDelta?.(event.text);
            break;
          case 'done':
            handlers.onDone?.(event.assistantMessageId);
            break;
          case 'error':
            handlers.onError?.(event.message);
            break;
        }
      } catch {
        // Ignore malformed frames.
      }
    }
  }
}
