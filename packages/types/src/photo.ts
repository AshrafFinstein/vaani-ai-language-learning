import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Photo conversation mode (Advanced AI Modes, master plan §16). The learner provides an
 * image (an uploaded data-URL OR an image URL — storage is intentionally simple), a MOCK
 * vision method on the AI provider returns a description, and the AI converses about the
 * photo. No real image analysis and no heavy upload pipeline happen here (deferred).
 */

const DebateMessageRole = z.enum(['USER', 'ASSISTANT']);

export const PhotoMessageDTO = z.object({
  id: z.string(),
  role: DebateMessageRole,
  content: z.string(),
  createdAt: z.string(),
});
export type PhotoMessageDTO = z.infer<typeof PhotoMessageDTO>;

export const PhotoSessionDTO = z.object({
  id: z.string(),
  /** The image the learner is talking about (data-URL or remote URL). */
  imageUrl: z.string(),
  /** The mock-vision description that seeds the conversation. */
  description: z.string(),
  level: LearningLevel,
  languageCode: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PhotoSessionDTO = z.infer<typeof PhotoSessionDTO>;

export const PhotoSessionDetailDTO = PhotoSessionDTO.extend({
  messages: z.array(PhotoMessageDTO),
});
export type PhotoSessionDetailDTO = z.infer<typeof PhotoSessionDetailDTO>;

/**
 * Accept either an uploaded image as a data-URL (base64) or a remote image URL.
 * We validate the shape but keep storage simple — the string is persisted as-is.
 */
const imageString = z
  .string()
  .min(1, 'Provide an image')
  .max(2_000_000, 'Image is too large')
  .refine(
    (v) => v.startsWith('data:image/') || /^https?:\/\//i.test(v),
    'Provide an image data-URL or an http(s) image URL',
  );

export const StartPhotoSessionInput = z.object({
  image: imageString,
  level: LearningLevel,
  languageCode: z.string().min(2).max(10).optional(),
});
export type StartPhotoSessionInput = z.infer<typeof StartPhotoSessionInput>;

export const PhotoMessageInput = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});
export type PhotoMessageInput = z.infer<typeof PhotoMessageInput>;
