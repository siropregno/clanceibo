import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: { auth: { signOut: (...a) => mockSignOut(...a) } },
}));

let mockAuthValue = { session: null, profile: null };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import Navbar from './navbar';

const renderNavbar = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

describe('Navbar', () => {
  beforeEach(() => mockSignOut.mockReset());

  it('shows an "Iniciar sesión" link when logged out', () => {
    mockAuthValue = { session: null, profile: null };
    renderNavbar();
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.queryByText('Mi cuenta')).not.toBeInTheDocument();
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
