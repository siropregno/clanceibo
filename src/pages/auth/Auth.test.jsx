import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: { auth: {
    signInWithPassword: (...a) => mockSignInWithPassword(...a),
    signUp: (...a) => mockSignUp(...a),
  } },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ session: null, loading: false }) }));

import Auth from './Auth';

const renderAuth = () => render(<MemoryRouter><Auth /></MemoryRouter>);

describe('Auth', () => {
  beforeEach(() => { mockSignInWithPassword.mockReset(); mockSignUp.mockReset(); });

  it('shows an error message when login fails', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderAuth();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@a.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /^ingresar$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorrectos/i));
  });

  it('rejects an invalid email without calling the API', async () => {
    renderAuth();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'not-an-email');
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'somepassword');
    await userEvent.click(screen.getByRole('button', { name: /^ingresar$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/email válido/i));
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    renderAuth();
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    expect(passwordInput).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByLabelText(/mostrar contraseña/i));
    expect(passwordInput).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByLabelText(/ocultar contraseña/i));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows an email-confirmation message on signup when no session is returned', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    renderAuth();
    await userEvent.click(screen.getByRole('button', { name: /registrarse/i }));
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Juan Perez');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'juan@ceibo.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirmar contraseña'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^crear cuenta$/i }));
    await waitFor(() => expect(screen.getByText(/revisá tu email/i)).toBeInTheDocument());
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'juan@ceibo.com',
      password: 'password123',
      options: { data: { nombre: 'Juan Perez' } },
    });
  });
});
