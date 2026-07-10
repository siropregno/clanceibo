import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithPassword = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: (...a) => mockSignInWithPassword(...a) } },
}));

import AdminLoginForm from './AdminLoginForm';

describe('AdminLoginForm', () => {
  beforeEach(() => mockSignInWithPassword.mockReset());

  it('shows an error message when sign-in fails', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<AdminLoginForm />);
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@a.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorrectos/i));
  });

  it('calls signInWithPassword with the entered credentials on submit', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    render(<AdminLoginForm />);
    await userEvent.type(screen.getByPlaceholderText('Email'), 'admin@ceibo.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'correctpass');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(mockSignInWithPassword)
      .toHaveBeenCalledWith({ email: 'admin@ceibo.com', password: 'correctpass' }));
  });
});
