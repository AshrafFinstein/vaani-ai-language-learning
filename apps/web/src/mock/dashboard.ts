/**
 * MOCK dashboard data — for UI development only (spec §27.H).
 * This is the ONLY place mock learning data lives. It is replaced by real
 * progress/analytics endpoints in a later phase. Do not import into API code.
 */
import type { LucideIcon } from 'lucide-react';
import {
  MessagesSquare,
  Drama,
  Phone,
  BookOpen,
  SpellCheck,
  Mic,
  Image,
  Scale,
} from 'lucide-react';

export interface SkillStat {
  key: string;
  label: string;
  score: number; // 0..100
}

export interface QuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface WeeklyPoint {
  day: string;
  minutes: number;
}

export interface MockDashboard {
  streakDays: number;
  level: string;
  xp: number;
  xpToNext: number;
  dailyGoalMinutes: number;
  minutesToday: number;
  weeklyMinutes: number;
  continueLearning: {
    title: string;
    skill: string;
    progress: number;
    to: string;
  };
  weekly: WeeklyPoint[];
  skills: SkillStat[];
  quickActions: QuickAction[];
}

export const mockDashboard: MockDashboard = {
  streakDays: 7,
  level: 'Intermediate (B1)',
  xp: 2480,
  xpToNext: 3000,
  dailyGoalMinutes: 30,
  minutesToday: 18,
  weeklyMinutes: 142,
  continueLearning: {
    title: 'Talking About Work',
    skill: 'Speaking',
    progress: 65,
    to: '/app/chat',
  },
  weekly: [
    { day: 'Mon', minutes: 22 },
    { day: 'Tue', minutes: 15 },
    { day: 'Wed', minutes: 30 },
    { day: 'Thu', minutes: 12 },
    { day: 'Fri', minutes: 25 },
    { day: 'Sat', minutes: 20 },
    { day: 'Sun', minutes: 18 },
  ],
  skills: [
    { key: 'speaking', label: 'Speaking', score: 72 },
    { key: 'listening', label: 'Listening', score: 68 },
    { key: 'reading', label: 'Reading', score: 81 },
    { key: 'writing', label: 'Writing', score: 64 },
    { key: 'vocabulary', label: 'Vocabulary', score: 76 },
    { key: 'grammar', label: 'Grammar', score: 70 },
    { key: 'pronunciation', label: 'Pronunciation', score: 66 },
  ],
  quickActions: [
    { label: 'AI Chat', to: '/app/chat', icon: MessagesSquare },
    { label: 'Roleplay', to: '/app/roleplay', icon: Drama },
    { label: 'Call', to: '/app/call', icon: Phone },
    { label: 'Vocabulary', to: '/app/vocabulary', icon: BookOpen },
    { label: 'Grammar', to: '/app/grammar', icon: SpellCheck },
    { label: 'Pronunciation', to: '/app/pronunciation', icon: Mic },
    { label: 'Photo Practice', to: '/app/photo', icon: Image },
    { label: 'Debate', to: '/app/debate', icon: Scale },
  ],
};
