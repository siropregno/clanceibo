import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockAuthValue = { session: null, loading: false, profile: null, profileLoading: false };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

let mockPlayers = [];
const mockUpdate = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({ error: null }) },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: mockPlayers, error: null }) }),
      update: (payload) => ({ eq: (_col, id) => mockUpdate(payload, id) }),
    }),
  },
}));

import Admin from './Admin';

const player = (over = {}) => ({
  id: 'p1',
  nombre: 'Ceibo Uno',
  rol_favorito: 'Fusilero',
  miembro_desde: '2024-01-01',
  avatar_url: null,
  is_active: true,
  apt_game_master: false,
  apt_paracaidismo: false,
  apt_medico: false,
  apt_tirador: false,
  apt_fuerzas_especiales: false,
  apt_peacekeeper: false,
  ...over,
});

const asAdmin = () => {
  mockAuthValue = {
    session: { user: { id: 'u1' } }, loading: false,
    profile: { is_admin: true }, profileLoading: false,
  };
};

const renderAdmin = () => render(
  <HelmetProvider>
    <MemoryRouter><Admin /></MemoryRouter>
  </HelmetProvider>
);

describe('Admin', () => {
  beforeEach(() => {
    mockUpdate.mockReset().mockResolvedValue({ error: null });
    mockPlayers = [];
  });

  it('shows the login form when there is no session', () => {
    mockAuthValue = { session: null, loading: false, profile: null, profileLoading: false };
    renderAdmin();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('blocks non-admin users', () => {
    mockAuthValue = {
      session: { user: { id: 'u1' } }, loading: false,
      profile: { is_admin: false }, profileLoading: false,
    };
    renderAdmin();
    expect(screen.getByText(/no tenés permisos/i)).toBeInTheDocument();
  });

  it('renders one aptitude badge image per enabled aptitude, and none for the rest', async () => {
    asAdmin();
    mockPlayers = [player({ apt_medico: true, apt_tirador: true })];
    renderAdmin();

    await screen.findByText('Ceibo Uno');
    const badges = screen.getByRole('row', { name: /ceibo uno/i }).querySelectorAll('.admin-badge');
    expect(badges).toHaveLength(2);
    expect(screen.getByAltText('Médico especialista')).toBeInTheDocument();
    expect(screen.getByAltText('Tirador especial')).toBeInTheDocument();
    expect(screen.queryByAltText('Game master')).not.toBeInTheDocument();

    // Guards against a badge rendering with an empty/undefined src, which in
    // the browser shows the alt text next to a broken-image glyph.
    badges.forEach((img) => {
      expect(img.getAttribute('src')).toBeTruthy();
      expect(img.getAttribute('src')).toMatch(/aptitud\./);
    });
  });

  it('marks the row inactive and offers Reactivar for a deactivated player', async () => {
    asAdmin();
    mockPlayers = [player({ is_active: false })];
    renderAdmin();

    const row = await screen.findByRole('row', { name: /ceibo uno/i });
    expect(row).toHaveClass('admin-row-inactive');
    expect(within(row).getByText('Inactivo')).toHaveClass('admin-tag-inactive');
    expect(within(row).getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  });

  it('deactivates a player when Eliminar is clicked', async () => {
    asAdmin();
    mockPlayers = [player()];
    renderAdmin();

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ is_active: false }, 'p1'));
    expect(await screen.findByText('Jugador desactivado.')).toBeInTheDocument();
  });

  it('opens the edit panel with the player name in the heading', async () => {
    asAdmin();
    mockPlayers = [player()];
    renderAdmin();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('heading', { name: /editando a ceibo uno/i })).toBeInTheDocument();
  });

  it('summarises the player count in the header', async () => {
    asAdmin();
    mockPlayers = [player(), player({ id: 'p2', nombre: 'Ceibo Dos', is_active: false })];
    renderAdmin();

    expect(await screen.findByText(/2 jugadores · 1 activo/)).toBeInTheDocument();
  });

  it('renders an em dash placeholder for missing role and date', async () => {
    asAdmin();
    mockPlayers = [player({ rol_favorito: null, miembro_desde: null })];
    renderAdmin();

    const row = await screen.findByRole('row', { name: /ceibo uno/i });
    // role, date and the empty-aptitudes cell
    expect(row.querySelectorAll('.admin-empty')).toHaveLength(3);
  });
});
