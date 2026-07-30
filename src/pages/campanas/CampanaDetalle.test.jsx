import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.mock('@lib/campaigns', () => ({
  fetchCampaignWithMissions: (...a) => mockFetch(...a),
}));

import CampanaDetalle from './CampanaDetalle';

const renderAt = (path = '/campanas/c1') => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/campanas/:id" element={<CampanaDetalle />} /></Routes>
    </MemoryRouter>
  </HelmetProvider>
);

const campaign = (over = {}) => ({
  id: 'c1', titulo: 'Tormenta del Sur', autor: 'Ceibo Uno',
  descripcion: 'Seis noches en Altis.', badge_url: null,
  missions: [], ...over,
});

const mission = (over = {}) => ({
  id: 'm1', titulo: 'Desembarco',
  mapa: 'Altis', descripcion: 'Playa norte.', imagen_url: null, ...over,
});

describe('CampanaDetalle', () => {
  beforeEach(() => mockFetch.mockReset());

  it('shows a loading state while fetching', async () => {
    let resolveFetch;
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    renderAt();
    expect(screen.getByText(/cargando campaña/i)).toBeInTheDocument();
    resolveFetch({ data: campaign(), error: null });
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
  });

  it('fetches the campaign named in the URL', async () => {
    mockFetch.mockResolvedValue({ data: campaign(), error: null });
    renderAt('/campanas/abc-123');
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('abc-123'));
  });

  it('renders the campaign header', async () => {
    mockFetch.mockResolvedValue({ data: campaign(), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByText('por Ceibo Uno')).toBeInTheDocument();
    expect(screen.getByText('Seis noches en Altis.')).toBeInTheDocument();
  });

  it('omits the author line when the campaign has none', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ autor: null }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(document.querySelector('.campanadetalle-autor')).toBeNull();
  });

  it('lists the missions with their map', async () => {
    mockFetch.mockResolvedValue({
      data: campaign({ missions: [mission(), mission({ id: 'm2', titulo: 'Contraataque', mapa: null, descripcion: null })] }),
      error: null,
    });
    renderAt();
    await waitFor(() => expect(screen.getByText('Desembarco')).toBeInTheDocument());
    expect(screen.getByText('Altis')).toBeInTheDocument();
    expect(screen.getByText('Playa norte.')).toBeInTheDocument();
    expect(screen.getByText('Contraataque')).toBeInTheDocument();
  });

  // The meta line was date · map; with dates gone the map is all of it, so
  // the element should not render at all rather than render empty.
  it('omits the meta line entirely when a mission has no map', async () => {
    mockFetch.mockResolvedValue({
      data: campaign({ missions: [mission({ mapa: null })] }), error: null,
    });
    renderAt();
    await waitFor(() => expect(screen.getByText('Desembarco')).toBeInTheDocument());
    expect(document.querySelector('.campanadetalle-mision-meta')).toBeNull();
  });

  it('renders a mission cover image when there is one', async () => {
    mockFetch.mockResolvedValue({
      data: campaign({ missions: [mission({ imagen_url: 'https://cdn.test/m.png' })] }), error: null,
    });
    renderAt();
    await waitFor(() => expect(document.querySelector('.campanadetalle-mision-img'))
      .toHaveAttribute('src', 'https://cdn.test/m.png'));
  });

  // The header and the missions are one campaign, so they live in one card
  // rather than two stacked panels that read as unrelated sections.
  it('renders the missions inside the same card as the campaign header', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ missions: [mission()] }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('Desembarco')).toBeInTheDocument());
    const card = document.querySelector('.campanadetalle-card');
    expect(card.querySelector('.campanadetalle-titulo')).not.toBeNull();
    expect(card.querySelector('.campanadetalle-misiones')).not.toBeNull();
    expect(document.querySelectorAll('.campanadetalle-card')).toHaveLength(1);
  });

  it('keeps the empty missions state inside that same card', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ missions: [] }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText(/todavía no tiene misiones/i)).toBeInTheDocument());
    const card = document.querySelector('.campanadetalle-card');
    expect(card).toContainElement(screen.getByText(/todavía no tiene misiones/i));
  });

  it('says so when the campaign has no missions', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ missions: [] }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText(/todavía no tiene misiones/i)).toBeInTheDocument());
  });

  it('pluralises the mission count', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ missions: [mission()] }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('1 misión')).toBeInTheDocument());
  });

  it('offers a way back to the campaign list', async () => {
    mockFetch.mockResolvedValue({ data: campaign(), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /volver a campañas/i })).toHaveAttribute('href', '/campanas');
  });

  // A bad id must not strand the visitor on a dead page with no way out.
  it('shows a not-found state with a way back when the campaign is missing', async () => {
    mockFetch.mockResolvedValue({ data: null, error: 'No se pudo cargar la campaña.' });
    renderAt('/campanas/nope');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cargar la campaña/i));
    expect(screen.getByRole('link', { name: /volver a campañas/i })).toHaveAttribute('href', '/campanas');
  });

  it('renders the campaign badge when there is one', async () => {
    mockFetch.mockResolvedValue({
      data: campaign({ badge_url: 'https://cdn.test/badge.png' }), error: null,
    });
    renderAt();
    await waitFor(() => expect(document.querySelector('.campanadetalle-badge'))
      .toHaveAttribute('src', 'https://cdn.test/badge.png'));
  });

  it('falls back to the initial when the campaign has no badge', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ badge_url: null }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('T')).toBeInTheDocument());
    expect(document.querySelector('.campanadetalle-badge')).toBeNull();
  });

  it('omits the description when the campaign has none', async () => {
    mockFetch.mockResolvedValue({ data: campaign({ descripcion: null }), error: null });
    renderAt();
    await waitFor(() => expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument());
    expect(document.querySelector('.campanadetalle-descripcion')).toBeNull();
  });

});
