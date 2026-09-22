/**
 * Static scenario content for Roleplay and Dialogue modes. Kept as data (not DB rows)
 * because it's authored product content; a later phase can migrate it to the database.
 * All scenarios are original Vaani AI content.
 */

export type ScenarioDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface RoleplayScenario {
  key: string;
  title: string;
  description: string;
  difficulty: ScenarioDifficulty;
  /** The role the AI plays. */
  aiRole: string;
  /** The role the learner plays. */
  userRole: string;
  setting: string;
  objectives: string[];
  vocab: string[];
  /** The AI's opening line (in-character) that seeds the conversation. */
  aiOpener: string;
}

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    key: 'restaurant',
    title: 'Ordering at a restaurant',
    description: 'Order a meal, ask about the menu, and handle the bill.',
    difficulty: 'EASY',
    aiRole: 'a friendly waiter',
    userRole: 'a customer',
    setting: 'a cozy neighborhood restaurant',
    objectives: ['Greet the waiter', 'Ask about a dish', 'Order food and a drink', 'Ask for the bill'],
    vocab: ['menu', 'recommend', 'starter', 'main course', 'bill'],
    aiOpener: "Good evening! Welcome. Here's our menu — can I get you something to drink to start?",
  },
  {
    key: 'job_interview',
    title: 'Job interview',
    description: 'Answer common interview questions about yourself and your experience.',
    difficulty: 'HARD',
    aiRole: 'a hiring manager',
    userRole: 'a candidate',
    setting: 'a modern office meeting room',
    objectives: ['Introduce yourself', 'Describe your experience', 'Explain your strengths', 'Ask a question'],
    vocab: ['experience', 'strengths', 'responsibilities', 'achievement', 'role'],
    aiOpener: "Thanks for coming in today. To start, could you tell me a little about yourself?",
  },
  {
    key: 'airport',
    title: 'At the airport',
    description: 'Check in for a flight and answer questions at security.',
    difficulty: 'MEDIUM',
    aiRole: 'an airline check-in agent',
    userRole: 'a traveler',
    setting: 'a busy airport check-in desk',
    objectives: ['Check in for your flight', 'Ask about baggage', 'Ask about the gate'],
    vocab: ['boarding pass', 'luggage', 'gate', 'departure', 'passport'],
    aiOpener: 'Good morning! May I see your passport and booking, please? Where are you flying today?',
  },
  {
    key: 'hotel',
    title: 'Hotel check-in',
    description: 'Check into a hotel and ask about the amenities.',
    difficulty: 'EASY',
    aiRole: 'a hotel receptionist',
    userRole: 'a guest',
    setting: 'a hotel reception desk',
    objectives: ['Check in', 'Ask about breakfast', 'Ask about wifi'],
    vocab: ['reservation', 'check-in', 'amenities', 'key card', 'checkout'],
    aiOpener: 'Welcome to the Grand Vaani Hotel! Do you have a reservation with us?',
  },
  {
    key: 'doctor',
    title: 'Doctor appointment',
    description: 'Describe symptoms and understand advice from a doctor.',
    difficulty: 'MEDIUM',
    aiRole: 'a doctor',
    userRole: 'a patient',
    setting: "a doctor's office",
    objectives: ['Describe your symptoms', 'Answer questions', 'Understand the advice'],
    vocab: ['symptom', 'prescription', 'appointment', 'pain', 'rest'],
    aiOpener: "Hello, please have a seat. What seems to be the problem today?",
  },
  {
    key: 'making_friends',
    title: 'Making friends',
    description: 'Meet someone new and find things in common.',
    difficulty: 'EASY',
    aiRole: 'a friendly person at a social event',
    userRole: 'a newcomer',
    setting: 'a casual meetup',
    objectives: ['Introduce yourself', 'Ask about hobbies', 'Find something in common'],
    vocab: ['hobby', 'weekend', 'interests', 'in common', 'hang out'],
    aiOpener: "Hi there! I don't think we've met — I'm Sam. Are you enjoying the event?",
  },
];

export interface DialogueScenario {
  key: string;
  title: string;
  description: string;
  goal: string;
  /** The AI's first line that opens the guided dialogue. */
  opener: string;
  targetTurns: number;
}

export const DIALOGUE_SCENARIOS: DialogueScenario[] = [
  {
    key: 'coffee_shop',
    title: 'At a coffee shop',
    description: 'Order a coffee and a snack at the counter.',
    goal: 'Order a drink and pay',
    opener: 'Hello! What can I get for you today?',
    targetTurns: 6,
  },
  {
    key: 'directions',
    title: 'Asking for directions',
    description: 'Ask how to get to the train station.',
    goal: 'Find your way to the station',
    opener: 'You look a little lost — do you need some help finding your way?',
    targetTurns: 6,
  },
  {
    key: 'shopping',
    title: 'Buying clothes',
    description: 'Ask about sizes and prices in a clothing store.',
    goal: 'Buy a shirt in your size',
    opener: 'Hi, welcome in! Are you looking for anything in particular today?',
    targetTurns: 6,
  },
];

export function findRoleplayScenario(key: string): RoleplayScenario | undefined {
  return ROLEPLAY_SCENARIOS.find((s) => s.key === key);
}

export function findDialogueScenario(key: string): DialogueScenario | undefined {
  return DIALOGUE_SCENARIOS.find((s) => s.key === key);
}
