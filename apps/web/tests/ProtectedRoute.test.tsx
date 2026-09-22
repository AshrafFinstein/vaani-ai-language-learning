import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrating: false });
  });

  it('redirects unauthenticated users to /login', () => {
    renderAt('/app');
    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        name: 'Alex',
        email: 'a@b.com',
        avatarUrl: null,
        role: 'USER',
        learningLanguageCode: null,
        level: null,
        dailyGoalMinutes: 30,
        theme: 'SYSTEM',
        createdAt: new Date().toISOString(),
      },
      isHydrating: false,
    });
    renderAt('/app');
    expect(screen.getByText(/secret dashboard/i)).toBeInTheDocument();
  });

  it('shows a loading state while hydrating', () => {
    useAuthStore.setState({ user: null, isHydrating: true });
    renderAt('/app');
    expect(screen.queryByText(/login screen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret dashboard/i)).not.toBeInTheDocument();
  });
});
