import { z } from 'zod';
import { LearningLevel } from './common.js';

/** Conversation topics offered on the AI Chat start screen (spec §3). */
export const ChatTopic = z.enum([
  'DAILY',
  'TRAVEL',
  'JOB_INTERVIEW',
  'WORKPLACE',
  'SHOPPING',
  'RESTAURANT',
  'FRIENDS',
  'TECHNOLOGY',
  'FREE',
]);
export type ChatTopic = z.infer<typeof ChatTopic>;

export interface ChatTopicMeta {
  value: ChatTopic;
  label: string;
  description: string;
}

/** Presentation metadata for topics (labels live here so client & server agree). */
export const CHAT_TOPICS: ChatTopicMeta[] = [
  { value: 'DAILY', label: 'Daily conversation', description: 'Everyday small talk and routines' },
  { value: 'TRAVEL', label: 'Travel', description: 'Airports, directions, sightseeing' },
  { value: 'JOB_INTERVIEW', label: 'Job interview', description: 'Practice interview questions' },
  { value: 'WORKPLACE', label: 'Workplace', description: 'Meetings, emails, colleagues' },
  { value: 'SHOPPING', label: 'Shopping', description: 'Stores, prices, returns' },
  { value: 'RESTAURANT', label: 'Restaurant', description: 'Ordering food and drinks' },
  { value: 'FRIENDS', label: 'Friends', description: 'Casual chats with friends' },
  { value: 'TECHNOLOGY', label: 'Technology', description: 'Gadgets, apps, the internet' },
  { value: 'FREE', label: 'Free conversation', description: 'Talk about anything you like' },
];

export const MessageRole = z.enum(['USER', 'ASSISTANT']);
export type MessageRole = z.infer<typeof MessageRole>;

/**
 * How a conversation is driven: open chat, a roleplay scenario, a guided dialogue,
 * a character persona (Phase 8), or an open scenario chat (Phase 8, reuses roleplay content).
 */
export const ConversationMode = z.enum([
  'CHAT',
  'ROLEPLAY',
  'DIALOGUE',
  'CHARACTER',
  'SCENARIO',
]);
export type ConversationMode = z.infer<typeof ConversationMode>;

export const MessageDTO = z.object({
  id: z.string(),
  role: MessageRole,
  content: z.string(),
  createdAt: z.string(),
});
export type MessageDTO = z.infer<typeof MessageDTO>;

export const ConversationDTO = z.object({
  id: z.string(),
  title: z.string(),
  mode: ConversationMode,
  topic: ChatTopic,
  scenarioKey: z.string().nullable(),
  level: LearningLevel,
  languageCode: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ConversationDTO = z.infer<typeof ConversationDTO>;

/** A conversation with its full message history. */
export const ConversationDetailDTO = ConversationDTO.extend({
  messages: z.array(MessageDTO),
});
export type ConversationDetailDTO = z.infer<typeof ConversationDetailDTO>;

/** Compact shape for the history list. */
export const ConversationSummaryDTO = ConversationDTO.extend({
  messageCount: z.number().int(),
  lastMessagePreview: z.string().nullable(),
});
export type ConversationSummaryDTO = z.infer<typeof ConversationSummaryDTO>;

export const StartConversationInput = z
  .object({
    mode: ConversationMode.default('CHAT'),
    /** Required for CHAT mode. */
    topic: ChatTopic.optional(),
    /** Required for ROLEPLAY/DIALOGUE mode — identifies the scenario. */
    scenarioKey: z.string().optional(),
    level: LearningLevel,
    /** Optional — defaults to the user's current learning language when omitted. */
    languageCode: z.string().min(2).max(10).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'CHAT' && !val.topic) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['topic'], message: 'Choose a topic' });
    }
    if (val.mode !== 'CHAT' && !val.scenarioKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scenarioKey'],
        message: 'Choose a scenario',
      });
    }
  });
export type StartConversationInput = z.infer<typeof StartConversationInput>;

export const SendMessageInput = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});
export type SendMessageInput = z.infer<typeof SendMessageInput>;

/** Server-Sent Events emitted by the streaming chat endpoint. */
export type ChatStreamEvent =
  | { type: 'meta'; conversationId: string; userMessageId: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; assistantMessageId: string }
  | { type: 'error'; message: string };
