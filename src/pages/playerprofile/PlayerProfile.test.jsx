import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPlayerSingle = vi.fn();
const mockScreenshotsOrder = vi.fn();

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: (table) => {
      if (table === 'players') {
        return {
          select: () => ({ eq: () => ({ single: (...a) => mockPlayerSingle(...a) }) }),
          update: () => ({ eq: vi.fn() }),
        };
      }
      if (table === 'player_screenshots') {
        return {
          select: () => ({ eq: () => ({ order: (...a) => mockScreenshotsOrder(...a) }) }),
        };
      }
      return {};
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}));

let mockAuthValue = { session: null, refreshProfile: vi.fn() };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import PlayerProfile from './PlayerProfile';

const renderAt = (path) => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/roster/:id" element={<PlayerProfile />} /></Routes>
    </MemoryRouter>
  </HelmetProvider>
);

const basePlayer = {
  id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', miembro_desde: '2024-03-01',
  apt_tirador: true, apt_medico: false, apt_game_master: false, avatar_url: null,
};

describe('PlayerProfile', () => {
  beforeEach(() => {
    mockPlayerSingle.mockReset();
    mockScreenshotsOrder.mockReset();
  });

  it('shows the player info without edit controls when viewing someone else', async () => {
    mockAuthValue = { session: { user: { id: 'someone-else' } }, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
    expect(screen.getByText('Miembro desde marzo 2024')).toBeInTheDocument();
    expect(screen.queryByText('Editar mi perfil')).not.toBeInTheDocument();
  });

  it('shows the edit button and screenshot uploader when viewing your own profile', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
    expect(screen.getByText('Editar mi perfil')).toBeInTheDocument();
    expect(screen.getByText(/agregar screenshot/i)).toBeInTheDocument();
  });

  it('shows an error state when the player cannot be loaded', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/ghost');
    await waitFor(() => expect(screen.getByText(/no se pudo cargar este perfil/i)).toBeInTheDocument());
  });

  it('only shows earned aptitudes, not the full fixed list', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText('Tirador especial')).toBeInTheDocument());
    expect(screen.queryByText('Medico especialista')).not.toBeInTheDocument();
    expect(screen.queryByText('Game master')).not.toBeInTheDocument();
  });

  it('shows the aptitude description as a hover tooltip', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText('Tirador especial')).toBeInTheDocument());
    expect(screen.getByTitle(/Completo desafios de tiro avanzados/)).toBeInTheDocument();
  });

  it('shows an empty-state message when no aptitudes are earned', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({
      data: { ...basePlayer, apt_tirador: false }, error: null,
    });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText(/no hay aptitudes aún/i)).toBeInTheDocument());
  });

  it('renders fetched screenshots in the gallery', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({
      data: [{ id: 's1', image_url: 'https://cdn.example.com/shot.png', storage_path: 'u1/shot.png' }],
      error: null,
    });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getAllByRole('img').some((img) => img.src.includes('shot.png'))).toBe(true));
  });
});
