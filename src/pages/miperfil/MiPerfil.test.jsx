import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const mockUpdateEq = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: (...a) => mockUpdateEq(...a) }) }),
    storage: { from: () => ({}) },
  },
}));

let mockAuthValue = { session: null, loading: false, profile: null, profileLoading: false, refreshProfile: vi.fn() };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import MiPerfil from './MiPerfil';

const renderMiPerfil = () => render(<MemoryRouter><MiPerfil /></MemoryRouter>);

const baseProfile = {
  id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', miembro_desde: '2024-03-01',
  apt_tirador: false, apt_medico: false, apt_mortero: false, avatar_url: null,
};

describe('MiPerfil', () => {
  it('shows a prompt to log in when there is no session', () => {
    mockAuthValue = { session: null, loading: false, profile: null, profileLoading: false, refreshProfile: vi.fn() };
    renderMiPerfil();
    expect(screen.getByText(/necesitás iniciar sesión/i)).toBeInTheDocument();
  });

  it('shows the profile, formatted since-date, and badge states when logged in', () => {
    mockAuthValue = {
      session: { user: { id: 'u1' } }, loading: false,
      profile: { ...baseProfile, apt_tirador: true },
      profileLoading: false, refreshProfile: vi.fn(),
    };
    renderMiPerfil();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Miembro desde marzo 2024')).toBeInTheDocument();
  });

  it('only shows nombre and rol_favorito fields when editing (not miembro_desde or aptitudes)', async () => {
    mockAuthValue = {
      session: { user: { id: 'u1' } }, loading: false,
      profile: baseProfile, profileLoading: false, refreshProfile: vi.fn(),
    };
    renderMiPerfil();
    await userEvent.click(screen.getByRole('button', { name: /editar mi perfil/i }));
    expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/miembro desde/i)).not.toBeInTheDocument();
  });

  it('calls refreshProfile after successfully saving an edit', async () => {
    mockAuthValue = {
      session: { user: { id: 'u1' } }, loading: false,
      profile: baseProfile, profileLoading: false, refreshProfile: vi.fn(),
    };
    mockUpdateEq.mockResolvedValue({ error: null });
    renderMiPerfil();
    await userEvent.click(screen.getByRole('button', { name: /editar mi perfil/i }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(mockAuthValue.refreshProfile).toHaveBeenCalled());
  });
});
