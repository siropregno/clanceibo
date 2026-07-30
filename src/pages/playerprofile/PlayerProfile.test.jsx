import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const mockPlayerCampaigns = vi.fn();
vi.mock('@lib/campaigns', () => ({
  fetchPlayerCampaigns: (...a) => mockPlayerCampaigns(...a),
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
    mockPlayerCampaigns.mockReset();
    mockPlayerCampaigns.mockResolvedValue({ data: [], error: null });
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
    expect(screen.queryByText('Médico especialista')).not.toBeInTheDocument();
    expect(screen.queryByText('Game master')).not.toBeInTheDocument();
  });

  it('shows the aptitude description in a tooltip on hover, hidden otherwise', async () => {
    mockAuthValue = { session: null, refreshProfile: vi.fn() };
    mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
    mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
    renderAt('/roster/u1');
    await waitFor(() => expect(screen.getByText('Tirador especial')).toBeInTheDocument());
    expect(screen.queryByText(/Completó desafíos de tiro avanzados/)).not.toBeInTheDocument();

    await userEvent.hover(screen.getByAltText('Tirador especial'));
    expect(screen.getByText(/Completó desafíos de tiro avanzados/)).toBeInTheDocument();

    await userEvent.unhover(screen.getByAltText('Tirador especial'));
    expect(screen.queryByText(/Completó desafíos de tiro avanzados/)).not.toBeInTheDocument();
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

  describe('campaigns block', () => {
    it('lists the campaign badges the player was granted', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({
        data: [
          { id: 'c1', titulo: 'Tormenta del Sur', badge_url: 'https://cdn.test/b.png' },
          { id: 'c2', titulo: 'Relámpago', badge_url: null },
        ],
        error: null,
      });
      renderAt('/roster/u1');
      // One link per campaign, named by the campaign. The title is not
      // visible text any more - it lives in the tooltip and the aria-label.
      await waitFor(() => expect(screen.getByRole('link', { name: 'Tormenta del Sur' })).toBeInTheDocument());
      expect(screen.getByRole('link', { name: 'Relámpago' })).toBeInTheDocument();
    });

    it('queries the campaigns of the profile being viewed', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      renderAt('/roster/u1');
      await waitFor(() => expect(mockPlayerCampaigns).toHaveBeenCalledWith('u1'));
    });

    it('shows an empty state when the player has no campaigns', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({ data: [], error: null });
      renderAt('/roster/u1');
      await waitFor(() => expect(screen.getByText(/no participó en campañas aún/i)).toBeInTheDocument());
    });

    // A failed campaign fetch must not take the whole profile down: the
    // block falls back to the empty state and the rest still renders.
    it('keeps rendering the profile when the campaign fetch fails', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({ data: null, error: 'No se pudieron cargar las campañas del jugador.' });
      renderAt('/roster/u1');
      await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
      expect(screen.getByText(/no participó en campañas aún/i)).toBeInTheDocument();
    });

    // Campaigns live in their own card, not inside the profile card with the
    // aptitudes: the two are different kinds of award and the campaign badges
    // link out.
    it('renders campaigns in their own card, outside the profile card', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({
        data: [{ id: 'c1', titulo: 'Tormenta', badge_url: null }], error: null,
      });
      renderAt('/roster/u1');
      await waitFor(() => expect(document.querySelector('.playerprofile-campaigns')).not.toBeNull());
      const profileCard = document.querySelector('.playerprofile-card');
      expect(profileCard.querySelector('.playerprofile-campaigns')).toBeNull();
    });

    it('links each campaign badge to its campaign in a new tab', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({
        data: [{ id: 'c1', titulo: 'Tormenta', badge_url: null }], error: null,
      });
      renderAt('/roster/u1');
      await waitFor(() => expect(document.querySelector('.playerprofile-campaigns')).not.toBeNull());
      const link = screen.getByRole('link', { name: 'Tormenta' });
      expect(link).toHaveAttribute('href', '/campanas/c1');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('keeps aptitudes and campaigns as separate blocks', async () => {
      mockAuthValue = { session: null, refreshProfile: vi.fn() };
      mockPlayerSingle.mockResolvedValue({ data: basePlayer, error: null });
      mockScreenshotsOrder.mockResolvedValue({ data: [], error: null });
      mockPlayerCampaigns.mockResolvedValue({
        data: [{ id: 'c1', titulo: 'Tormenta', badge_url: null }], error: null,
      });
      renderAt('/roster/u1');
      await waitFor(() => expect(screen.getByRole('link', { name: 'Tormenta' })).toBeInTheDocument());
      expect(screen.getByRole('heading', { name: /^aptitudes$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^campañas$/i })).toBeInTheDocument();
    });
  });
});
