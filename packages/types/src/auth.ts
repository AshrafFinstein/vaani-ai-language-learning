import { z } from 'zod';
import { LearningLevel, ThemePreference } from './common.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const RegisterInput = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Enter a valid email').max(254),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email('Enter a valid email').max(254),
  password: z.string().min(1, 'Password is required').max(100),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = z.object({
  email: z.string().email('Enter a valid email').max(254),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

/** Safe user representation returned to the client (never includes password hash). */
export const UserDTO = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  role: z.enum(['USER', 'ADMIN']),
  learningLanguageCode: z.string().nullable(),
  level: LearningLevel.nullable(),
  dailyGoalMinutes: z.number().int(),
  theme: ThemePreference,
  createdAt: z.string(),
});
export type UserDTO = z.infer<typeof UserDTO>;

export const AuthResponse = z.object({
  user: UserDTO,
});
export type AuthResponse = z.infer<typeof AuthResponse>;
