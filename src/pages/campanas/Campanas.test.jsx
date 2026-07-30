import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.mock('@lib/campaigns', () => ({
  fetchCampaignsWithMissions: (...a) => mockFetch(...a),
}));

import Campanas from './Campanas';

const renderPage = () => render(<HelmetProvider><Campanas /></HelmetProvider>);

const campaign = (over = {}) => ({
  id: 'c1', titulo: 'Tormenta del Sur', descripcion: 'Seis noches en Altis.',
  badge_url: null, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-15',
  missions: [], ...over,
});

describe('Campanas', () => {
  beforeEach(() => mockFetch.mockReset());

  it('shows a loading state while fetching', async () => {
    let resolveFetch;
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    renderPage();
    expect(screen.getByText(/cargando campañas/i)).toBeInTheDocument();
    resolveFetch({ data: [], error: null });
    await waitFor(() => expect(screen.getByText(/todavía no hay campañas/i)).toBeInTheDocument());
  });

  it('shows an empty state when there are no campaigns', async () => {
    mockFetch.mockResolvedValue({ data: [], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText(/todavía no hay campañas/i)).toBeInTheDocument());
  });

  it('surfaces a fetch error', async () => {
    mockFetch.mockResolvedValue({ data: null, error: 'No se pudieron cargar las campañas.' });
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar/i));
  });

  it('renders a campaign with its title, description and date range', async () => {
    mockFetch.mockResolvedValue({ data: [campaign()], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByText('Seis noches en Altis.')).toBeInTheDocument();
    expect(screen.getByText('1 de marzo de 2026 — 15 de abril de 2026')).toBeInTheDocument();
  });

  it('lists the missions of a campaign', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({
        missions: [
          { id: 'm1', titulo: 'Desembarco', fecha: '2026-03-01', mapa: 'Altis', descripcion: 'Playa norte.', imagen_url: null },
          { id: 'm2', titulo: 'Contraataque', fecha: '2026-03-08', mapa: null, descripcion: null, imagen_url: null },
        ],
      })],
      error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Desembarco')).toBeInTheDocument());
    expect(screen.getByText('Contraataque')).toBeInTheDocument();
    expect(screen.getByText('1 de marzo de 2026 · Altis')).toBeInTheDocument();
    expect(screen.getByText('Playa norte.')).toBeInTheDocument();
  });

  it('omits the map separator when a mission has no map', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({ missions: [{ id: 'm1', titulo: 'Sin mapa', fecha: '2026-03-08', mapa: null, descripcion: null, imagen_url: null }] })],
      error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('8 de marzo de 2026')).toBeInTheDocument());
  });

  it('pluralises the mission count', async () => {
    mockFetch.mockResolvedValue({
      data: [
        campaign({ id: 'c1', titulo: 'Una', missions: [{ id: 'm1', titulo: 'M', fecha: '2026-03-01' }] }),
        campaign({ id: 'c2', titulo: 'Dos', missions: [
          { id: 'm2', titulo: 'A', fecha: '2026-03-01' }, { id: 'm3', titulo: 'B', fecha: '2026-03-02' },
        ] }),
      ],
      error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('1 misión')).toBeInTheDocument());
    expect(screen.getByText('2 misiones')).toBeInTheDocument();
  });

  it('shows a campaign that has no missions yet', async () => {
    mockFetch.mockResolvedValue({ data: [campaign({ missions: [] })], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByText('0 misiones')).toBeInTheDocument();
  });

  it('renders the campaign badge when there is one', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({ badge_url: 'https://cdn.test/badge.png' })], error: null,
    });
    renderPage();
    await waitFor(() => expect(document.querySelector('.campana-badge')).toHaveAttribute('src', 'https://cdn.test/badge.png'));
  });

  it('omits the date range when the campaign has no dates', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({ fecha_inicio: null, fecha_fin: null })], error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(document.querySelector('.campana-fechas')).toBeNull();
  });
});
