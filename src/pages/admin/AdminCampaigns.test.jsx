import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchCampaigns = vi.fn();
const mockFetchTitles = vi.fn();
const mockGrant = vi.fn();
const mockRevoke = vi.fn();

vi.mock('@lib/campaigns', () => ({
  fetchCampaignsWithMissions: (...a) => mockFetchCampaigns(...a),
  fetchTitlesByCampaign: (...a) => mockFetchTitles(...a),
  grantTitle: (...a) => mockGrant(...a),
  revokeTitle: (...a) => mockRevoke(...a),
}));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: (...a) => mockInsert(...a),
      update: (...a) => ({ eq: () => mockUpdate(...a) }),
      delete: () => ({ eq: (...a) => mockDelete(...a) }),
    }),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}));

import AdminCampaigns from './AdminCampaigns';

const PLAYERS = [
  { id: 'p1', nombre: 'Juan', is_active: true, avatar_url: null },
  { id: 'p2', nombre: 'Ana', is_active: true, avatar_url: null },
  { id: 'p3', nombre: 'Retirado', is_active: false, avatar_url: null },
];

const campaign = (over = {}) => ({
  id: 'c1', titulo: 'Tormenta', descripcion: null, badge_url: null, badge_path: null,
  fecha_inicio: '2026-03-01', fecha_fin: null, missions: [], ...over,
});

const renderAdmin = (players = PLAYERS) => render(<AdminCampaigns players={players} />);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchCampaigns.mockResolvedValue({ data: [], error: null });
  mockFetchTitles.mockResolvedValue({ data: new Map(), error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockResolvedValue({ error: null });
  mockDelete.mockResolvedValue({ error: null });
  mockGrant.mockResolvedValue({ error: null });
  mockRevoke.mockResolvedValue({ error: null });
});

describe('AdminCampaigns loading and empty states', () => {
  it('shows an empty state when there are no campaigns', async () => {
    renderAdmin();
    await waitFor(() => expect(screen.getByText(/todavía no hay campañas/i)).toBeInTheDocument());
  });

  it('surfaces a fetch error', async () => {
    mockFetchCampaigns.mockResolvedValue({ data: null, error: 'No se pudieron cargar las campañas.' });
    renderAdmin();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar/i));
  });

  it('lists campaigns with their mission and badge counts', async () => {
    mockFetchCampaigns.mockResolvedValue({
      data: [campaign({ missions: [{ id: 'm1', titulo: 'Uno', fecha: '2026-03-01' }] })],
      error: null,
    });
    mockFetchTitles.mockResolvedValue({ data: new Map([['c1', new Set(['p1', 'p2'])]]), error: null });
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Tormenta')).toBeInTheDocument());
    expect(screen.getByText(/1 misión · 2 con insignia/)).toBeInTheDocument();
  });
});

describe('creating a campaign', () => {
  it('refuses to save without a title', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/título de la campaña es obligatorio/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts a campaign with the title filled in', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.type(screen.getByLabelText(/título/i), 'Tormenta del Sur');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ titulo: 'Tormenta del Sur' });
  });

  // '' is not a valid Postgres date; it has to reach the API as null or the
  // insert fails with an invalid-input-syntax error.
  it('sends blank optional fields as null, not empty strings', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.type(screen.getByLabelText(/título/i), 'Sin fechas');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.fecha_inicio).toBeNull();
    expect(payload.fecha_fin).toBeNull();
    expect(payload.descripcion).toBeNull();
  });

  it('trims whitespace off the title', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.type(screen.getByLabelText(/título/i), '   Espaciada   ');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0].titulo).toBe('Espaciada');
  });

  it('updates instead of inserting when editing an existing campaign', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await waitFor(() => screen.getByText('Tormenta'));
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('missions', () => {
  const expand = async (user) => {
    await waitFor(() => screen.getByText('Tormenta'));
    await user.click(screen.getByRole('button', { name: /gestionar/i }));
  };

  it('requires a title and a date', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    await user.click(screen.getByRole('button', { name: /nueva misión/i }));
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/título de la misión es obligatorio/i);

    await user.type(screen.getByLabelText(/título/i), 'Desembarco');
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/fecha de la misión es obligatoria/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts a mission tied to its campaign', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    await user.click(screen.getByRole('button', { name: /nueva misión/i }));
    await user.type(screen.getByLabelText(/título/i), 'Desembarco');
    await user.type(screen.getByLabelText(/fecha/i), '2026-03-08');
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      campaign_id: 'c1', titulo: 'Desembarco', fecha: '2026-03-08',
    });
  });

  it('lists existing missions of the expanded campaign', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({
      data: [campaign({ missions: [{ id: 'm1', titulo: 'Desembarco', fecha: '2026-03-01', mapa: 'Altis' }] })],
      error: null,
    });
    renderAdmin();
    await expand(user);
    expect(screen.getByText('Desembarco')).toBeInTheDocument();
    expect(screen.getByText('2026-03-01 · Altis')).toBeInTheDocument();
  });

  it('says so when a campaign has no missions', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    expect(screen.getByText(/esta campaña no tiene misiones/i)).toBeInTheDocument();
  });
});

describe('granting campaign badges', () => {
  const expand = async (user) => {
    await waitFor(() => screen.getByText('Tormenta'));
    await user.click(screen.getByRole('button', { name: /gestionar/i }));
  };

  it('lists only active players', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    expect(within(grid).getByText('Juan')).toBeInTheDocument();
    expect(within(grid).getByText('Ana')).toBeInTheDocument();
    expect(within(grid).queryByText('Retirado')).toBeNull();
  });

  it('checks the players who already have the badge', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    mockFetchTitles.mockResolvedValue({ data: new Map([['c1', new Set(['p1'])]]), error: null });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    const boxes = within(grid).getAllByRole('checkbox');
    expect(boxes[0]).toBeChecked();   // Juan
    expect(boxes[1]).not.toBeChecked(); // Ana
  });

  it('grants the badge when an unchecked player is ticked', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    await user.click(within(grid).getAllByRole('checkbox')[0]);
    await waitFor(() => expect(mockGrant).toHaveBeenCalledWith('c1', 'p1'));
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('revokes the badge when a checked player is unticked', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    mockFetchTitles.mockResolvedValue({ data: new Map([['c1', new Set(['p1'])]]), error: null });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    await user.click(within(grid).getAllByRole('checkbox')[0]);
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('c1', 'p1'));
    expect(mockGrant).not.toHaveBeenCalled();
  });

  // The toggle updates local state rather than refetching, so this pins that
  // the checkbox actually reflects the change without a reload.
  it('reflects the grant immediately in the checkbox', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    const box = within(grid).getAllByRole('checkbox')[0];
    expect(box).not.toBeChecked();
    await user.click(box);
    await waitFor(() => expect(box).toBeChecked());
  });

  it('leaves the checkbox alone and reports the error when granting fails', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    mockGrant.mockResolvedValue({ error: 'No se pudo otorgar la campaña.' });
    renderAdmin();
    await expand(user);
    const grid = document.querySelector('.admin-title-grid');
    const box = within(grid).getAllByRole('checkbox')[0];
    await user.click(box);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo otorgar/i));
    expect(box).not.toBeChecked();
  });
});
