import {
  LayoutDashboard,
  MessagesSquare,
  Drama,
  Phone,
  MessageCircle,
  Type,
  BookA,
  Image,
  Scale,
  Users,
  GraduationCap,
  BookOpen,
  SpellCheck,
  Mic,
  BarChart3,
  History,
  Trophy,
  CalendarClock,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** False for routes whose feature ships in a later phase (renders "Coming soon"). */
  ready?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard, ready: true }],
  },
  {
    title: 'Practice',
    items: [
      { label: 'AI Chat', to: '/app/chat', icon: MessagesSquare },
      { label: 'Roleplay', to: '/app/roleplay', icon: Drama },
      { label: 'Call', to: '/app/call', icon: Phone },
      { label: 'Dialogue', to: '/app/dialogue', icon: MessageCircle },
      { label: 'Sentence', to: '/app/sentence', icon: Type },
      { label: 'Word', to: '/app/word', icon: BookA },
      { label: 'Photo', to: '/app/photo', icon: Image },
      { label: 'Debate', to: '/app/debate', icon: Scale },
      { label: 'Characters', to: '/app/characters', icon: Users },
    ],
  },
  {
    title: 'Meetings',
    items: [
      { label: 'Meetings', to: '/app/meetings', icon: CalendarClock, ready: true },
    ],
  },
  {
    title: 'Learn',
    items: [
      { label: 'Courses', to: '/app/courses', icon: GraduationCap },
      { label: 'Vocabulary', to: '/app/vocabulary', icon: BookOpen },
      { label: 'Grammar', to: '/app/grammar', icon: SpellCheck },
      { label: 'Pronunciation', to: '/app/pronunciation', icon: Mic },
    ],
  },
  {
    title: 'Progress',
    items: [
      { label: 'Statistics', to: '/app/progress', icon: BarChart3 },
      { label: 'History', to: '/app/history', icon: History },
      { label: 'Achievements', to: '/app/achievements', icon: Trophy },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Profile', to: '/app/profile', icon: User, ready: true }],
  },
];

/** Condensed set for the mobile bottom navigation bar. */
export const MOBILE_NAV: NavItem[] = [
  { label: 'Home', to: '/app/dashboard', icon: LayoutDashboard, ready: true },
  { label: 'Chat', to: '/app/chat', icon: MessagesSquare },
  { label: 'Courses', to: '/app/courses', icon: GraduationCap },
  { label: 'Profile', to: '/app/profile', icon: User, ready: true },
];
