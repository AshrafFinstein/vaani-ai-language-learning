import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/pages/public/Login';
import { renderWithProviders } from './test-utils';

describe('LoginPage', () => {
  it('renders the login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows client-side validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});
