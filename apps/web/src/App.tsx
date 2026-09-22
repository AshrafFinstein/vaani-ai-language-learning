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
import ProfilePage from '@/pages/app/Profile';
import ComingSoonPage from '@/pages/app/ComingSoon';

/** Authenticated feature routes not yet built — each renders the ComingSoon page. */
const COMING_SOON = [
  'chat',
  'roleplay',
  'call',
  'dialogue',
  'sentence',
  'word',
  'photo',
  'debate',
  'characters',
  'courses',
  'vocabulary',
  'grammar',
  'pronunciation',
  'progress',
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
