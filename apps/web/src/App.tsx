import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useHydrateAuth } from '@/features/auth/useAuth';

import LandingPage from '@/pages/public/Landing';
import LoginPage from '@/pages/public/Login';
import RegisterPage from '@/pages/public/Register';
import ForgotPasswordPage from '@/pages/public/ForgotPassword';
import MarketingPlaceholder from '@/pages/public/MarketingPlaceholder';
import DashboardPage from '@/pages/app/Dashboard';
import ChatPage from '@/pages/app/Chat';
import RoleplayPage from '@/pages/app/Roleplay';
import DialoguePage from '@/pages/app/Dialogue';
import SentencePage from '@/pages/app/Sentence';
import WordPage from '@/pages/app/Word';
import CallPage from '@/pages/app/Call';
import MeetingsPage from '@/pages/app/Meetings';
import MeetingSchedulePage from '@/pages/app/MeetingSchedule';
import MeetingDetailPage from '@/pages/app/MeetingDetail';
import CharactersPage from '@/pages/app/Characters';
import DebatePage from '@/pages/app/Debate';
import PhotoPage from '@/pages/app/Photo';
import CoursesPage from '@/pages/app/Courses';
import CourseDetailPage from '@/pages/app/CourseDetail';
import FlashcardsPage from '@/pages/app/Flashcards';
import FlashcardStudyPage from '@/pages/app/FlashcardStudy';
import ExplorePage from '@/pages/app/Explore';
import ProgressPage from '@/pages/app/Progress';
import ProfilePage from '@/pages/app/Profile';
import ComingSoonPage from '@/pages/app/ComingSoon';

/** Authenticated feature routes not yet built — each renders the ComingSoon page. */
const COMING_SOON = [
  'vocabulary',
  'grammar',
  'pronunciation',
  'history',
  'achievements',
  'subscription',
  'help',
];

export default function App() {
  // Check the session cookie once on mount and hydrate the auth store.
  useHydrateAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/features" element={<MarketingPlaceholder title="Features" />} />
      <Route path="/pricing" element={<MarketingPlaceholder title="Pricing" />} />
      <Route path="/about" element={<MarketingPlaceholder title="About" />} />
      <Route path="/terms" element={<MarketingPlaceholder title="Terms of Service" />} />
      <Route path="/privacy" element={<MarketingPlaceholder title="Privacy Policy" />} />

      {/* Authenticated */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:id" element={<ChatPage />} />
        <Route path="roleplay" element={<RoleplayPage />} />
        <Route path="roleplay/:id" element={<RoleplayPage />} />
        <Route path="dialogue" element={<DialoguePage />} />
        <Route path="dialogue/:id" element={<DialoguePage />} />
        <Route path="sentence" element={<SentencePage />} />
        <Route path="word" element={<WordPage />} />
        <Route path="call" element={<CallPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="meetings/schedule" element={<MeetingSchedulePage />} />
        <Route path="meetings/:id" element={<MeetingDetailPage />} />
        <Route path="characters" element={<CharactersPage />} />
        <Route path="characters/:id" element={<CharactersPage />} />
        <Route path="debate" element={<DebatePage />} />
        <Route path="debate/:id" element={<DebatePage />} />
        <Route path="photo" element={<PhotoPage />} />
        <Route path="photo/:id" element={<PhotoPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:slug" element={<CourseDetailPage />} />
        <Route path="flashcards" element={<FlashcardsPage />} />
        <Route path="flashcards/:deckId" element={<FlashcardStudyPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<Navigate to="/app/profile" replace />} />
        {COMING_SOON.map((path) => (
          <Route key={path} path={path} element={<ComingSoonPage />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
