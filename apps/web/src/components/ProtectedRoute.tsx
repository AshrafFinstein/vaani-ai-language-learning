import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/Logo';

/** Gates the authenticated app: waits for hydration, then redirects if signed out. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const location = useLocation();

  if (isHydrating) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
