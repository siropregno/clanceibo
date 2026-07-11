import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: { auth: { signOut: (...a) => mockSignOut(...a) } },
}));

let mockAuthValue = { session: null, profile: null };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import Navbar from './navbar';

const renderNavbar = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

const AuthStub = () => {
  const location = useLocation();
  return <div>Auth mode: {location.state?.mode || 'none'}</div>;
};

const renderNavbarWithAuthRoute = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Navbar />
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/ingresar" element={<AuthStub />} />
    </Routes>
  </MemoryRouter>
);

describe('Navbar', () => {
  beforeEach(() => mockSignOut.mockReset());

  it('shows Registrarse and iniciar sesión buttons when logged out', () => {
    mockAuthValue = { session: null, profile: null };
    renderNavbar();
    expect(screen.getByRole('button', { name: 'Registrarse' })).toBeInTheDocument();
    expect(screen.getByText('o')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText('Mi cuenta')).not.toBeInTheDocument();
  });

  it('navigates to /ingresar with signup mode when Registrarse is clicked', async () => {
    mockAuthValue = { session: null, profile: null };
    renderNavbarWithAuthRoute();
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(screen.getByText('Auth mode: signup')).toBeInTheDocument();
  });

  it('navigates to /ingresar with login mode when iniciar sesión is clicked', async () => {
    mockAuthValue = { session: null, profile: null };
    renderNavbarWithAuthRoute();
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(screen.getByText('Auth mode: login')).toBeInTheDocument();
  });

  it('shows the profile name as a closed dropdown trigger when logged in', () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, profile: { nombre: 'Juan Perez', avatar_url: null } };
    renderNavbar();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.queryByText('Mi perfil')).not.toBeInTheDocument();
    expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument();
  });

  it('opens the dropdown on click, revealing Mi perfil and Cerrar sesión', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, profile: { nombre: 'Juan Perez', avatar_url: null } };
    renderNavbar();
    await userEvent.click(screen.getByText('Juan Perez'));
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
  });

  it('closes the dropdown when clicking outside', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, profile: { nombre: 'Juan Perez', avatar_url: null } };
    renderNavbar();
    await userEvent.click(screen.getByText('Juan Perez'));
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText('Mi perfil')).not.toBeInTheDocument());
  });

  it('signs out and closes the dropdown when Cerrar sesión is clicked', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, profile: { nombre: 'Juan Perez', avatar_url: null } };
    mockSignOut.mockResolvedValue({ error: null });
    renderNavbar();
    await userEvent.click(screen.getByText('Juan Perez'));
    await userEvent.click(screen.getByText('Cerrar sesión'));
    expect(mockSignOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument());
  });
});
