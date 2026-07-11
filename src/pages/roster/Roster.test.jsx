import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: (...a) => mockOrder(...a) }) }) }) },
}));

import Roster from './Roster';

const renderRoster = () => render(<HelmetProvider><MemoryRouter><Roster /></MemoryRouter></HelmetProvider>);

describe('Roster', () => {
  beforeEach(() => mockOrder.mockReset());

  it('shows a loading state while fetching', async () => {
    let resolveFetch;
    mockOrder.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    renderRoster();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    resolveFetch({ data: [], error: null });
    await waitFor(() => expect(screen.getByText(/todavía no hay miembros/i)).toBeInTheDocument());
  });

  it('renders player rows after a successful fetch', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: '1', nombre: 'Juan Perez', rol_favorito: 'Rifleman',
        apt_tirador: false, apt_medico: false, apt_mortero: false }],
      error: null,
    });
    renderRoster();
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /juan perez/i })).toHaveAttribute('href', '/roster/1');
  });

  it('shows an empty state when there are no players', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    renderRoster();
    await waitFor(() => expect(screen.getByText(/todavía no hay miembros/i)).toBeInTheDocument());
  });

  it('shows an error state when the fetch fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'network error' } });
    renderRoster();
    await waitFor(() => expect(screen.getByText(/no se pudo cargar el roster/i)).toBeInTheDocument());
  });
});
