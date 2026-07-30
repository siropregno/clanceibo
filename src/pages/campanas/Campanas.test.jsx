import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.mock('@lib/campaigns', () => ({
  fetchCampaigns: (...a) => mockFetch(...a),
}));

import Campanas from './Campanas';

const renderPage = () => render(
  <HelmetProvider><MemoryRouter><Campanas /></MemoryRouter></HelmetProvider>
);

const campaign = (over = {}) => ({
  id: 'c1', titulo: 'Tormenta del Sur', descripcion: 'Seis noches en Altis.',
  badge_url: null, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-15',
  mission_count: 0, ...over,
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

  it('renders a card with the title, description and date range', async () => {
    mockFetch.mockResolvedValue({ data: [campaign()], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByText('Seis noches en Altis.')).toBeInTheDocument();
    expect(screen.getByText('1 de marzo de 2026 — 15 de abril de 2026')).toBeInTheDocument();
  });

  // The whole card is the link, matching PlayerRow: clicking anywhere on it
  // opens the campaign rather than needing a small "ver más" target.
  it('links the whole card to the campaign detail page', async () => {
    mockFetch.mockResolvedValue({ data: [campaign()], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /tormenta del sur/i }))
      .toHaveAttribute('href', '/campanas/c1');
  });

  it('gives each campaign its own link', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign(), campaign({ id: 'c2', titulo: 'Relámpago' })], error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Relámpago')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /tormenta del sur/i })).toHaveAttribute('href', '/campanas/c1');
    expect(screen.getByRole('link', { name: /relámpago/i })).toHaveAttribute('href', '/campanas/c2');
  });

  it('pluralises the mission count', async () => {
    mockFetch.mockResolvedValue({
      data: [
        campaign({ id: 'c1', titulo: 'Una', mission_count: 1 }),
        campaign({ id: 'c2', titulo: 'Dos', mission_count: 2 }),
      ],
      error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('1 misión')).toBeInTheDocument());
    expect(screen.getByText('2 misiones')).toBeInTheDocument();
  });

  it('shows a zero count for a campaign with no missions', async () => {
    mockFetch.mockResolvedValue({ data: [campaign({ mission_count: 0 })], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('0 misiones')).toBeInTheDocument());
  });

  it('renders the campaign badge when there is one', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({ badge_url: 'https://cdn.test/badge.png' })], error: null,
    });
    renderPage();
    await waitFor(() => expect(document.querySelector('.campana-badge'))
      .toHaveAttribute('src', 'https://cdn.test/badge.png'));
  });

  it('falls back to the initial when the campaign has no badge', async () => {
    mockFetch.mockResolvedValue({ data: [campaign({ badge_url: null })], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('T')).toBeInTheDocument());
    expect(document.querySelector('.campana-badge')).toBeNull();
  });

  it('omits the date range when the campaign has no dates', async () => {
    mockFetch.mockResolvedValue({
      data: [campaign({ fecha_inicio: null, fecha_fin: null })], error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(document.querySelector('.campana-fechas')).toBeNull();
  });

  it('omits the description when the campaign has none', async () => {
    mockFetch.mockResolvedValue({ data: [campaign({ descripcion: null })], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(document.querySelector('.campana-descripcion')).toBeNull();
  });

  // The list card only shows a count, so pulling every mission row for a page
  // that renders none of them would be wasted payload.
  it('does not render mission details on the list page', async () => {
    mockFetch.mockResolvedValue({ data: [campaign({ mission_count: 3 })], error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText('3 misiones')).toBeInTheDocument());
    expect(document.querySelector('.campanadetalle-misiones')).toBeNull();
  });
});
