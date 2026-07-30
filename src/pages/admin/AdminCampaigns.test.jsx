import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchCampaigns = vi.fn();
const mockFetchTitles = vi.fn();
const mockGrant = vi.fn();
const mockRevoke = vi.fn();
const mockSwapOrder = vi.fn();
const mockSetVisibility = vi.fn();

// neighborSwap and reorderLocally are pure and covered directly in
// campaigns.test.js, so the real implementations are used here - mocking them
// would leave these tests asserting against a reimplementation of the very
// arithmetic that decides what the admin sees. Only the network call is a mock.
vi.mock('@lib/campaigns', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchCampaignsWithMissions: (...a) => mockFetchCampaigns(...a),
    fetchTitlesByCampaign: (...a) => mockFetchTitles(...a),
    grantTitle: (...a) => mockGrant(...a),
    revokeTitle: (...a) => mockRevoke(...a),
    swapCampaignOrder: (...a) => mockSwapOrder(...a),
    setCampaignVisibility: (...a) => mockSetVisibility(...a),
  };
});

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
  id: 'c1', titulo: 'Tormenta', autor: null, descripcion: null,
  badge_url: null, badge_path: null, visible: true, missions: [], ...over,
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
  mockSwapOrder.mockResolvedValue({ error: null });
  mockSetVisibility.mockResolvedValue({ error: null });
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
      data: [campaign({ missions: [{ id: 'm1', titulo: 'Uno' }] })],
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
    await user.type(screen.getByLabelText(/título/i), 'Sin extras');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.autor).toBeNull();
    expect(payload.descripcion).toBeNull();
  });

  it('saves the author when one is given', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.type(screen.getByLabelText(/título/i), 'Tormenta');
    await user.type(screen.getByLabelText(/autor/i), 'Ceibo Uno');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0].autor).toBe('Ceibo Uno');
  });

  it('trims whitespace off the author', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await waitFor(() => screen.getByText(/todavía no hay campañas/i));
    await user.click(screen.getByRole('button', { name: /nueva campaña/i }));
    await user.type(screen.getByLabelText(/título/i), 'Tormenta');
    await user.type(screen.getByLabelText(/autor/i), '   Ceibo Uno   ');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0].autor).toBe('Ceibo Uno');
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

  it('requires a title', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    await user.click(screen.getByRole('button', { name: /nueva misión/i }));
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/título de la misión es obligatorio/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // The title is now the only required field: 0009 dropped missions.fecha,
  // so a mission with just a name is valid.
  it('inserts a mission with only a title', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    await user.click(screen.getByRole('button', { name: /nueva misión/i }));
    await user.type(screen.getByLabelText(/título/i), 'Desembarco');
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      campaign_id: 'c1', titulo: 'Desembarco',
    });
  });

  it('does not send a fecha field at all', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    await user.click(screen.getByRole('button', { name: /nueva misión/i }));
    await user.type(screen.getByLabelText(/título/i), 'Desembarco');
    await user.click(screen.getByRole('button', { name: /guardar misión/i }));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).not.toHaveProperty('fecha');
  });

  it('lists existing missions of the expanded campaign', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({
      data: [campaign({ missions: [{ id: 'm1', titulo: 'Desembarco', mapa: 'Altis' }] })],
      error: null,
    });
    renderAdmin();
    await expand(user);
    expect(screen.getByText('Desembarco')).toBeInTheDocument();
    expect(screen.getByText('Altis')).toBeInTheDocument();
  });

  it('says so when a campaign has no missions', async () => {
    const user = userEvent.setup();
    mockFetchCampaigns.mockResolvedValue({ data: [campaign()], error: null });
    renderAdmin();
    await expand(user);
    expect(screen.getByText(/esta campaña no tiene misiones/i)).toBeInTheDocument();
  });
});

describe('reordering campaigns', () => {
  const THREE = [
    campaign({ id: 'c1', titulo: 'Primera' }),
    campaign({ id: 'c2', titulo: 'Segunda' }),
    campaign({ id: 'c3', titulo: 'Tercera' }),
  ];

  // The rendered order of the campaign cards, which is what an admin judges
  // the feature by.
  const titlesInOrder = () =>
    [...document.querySelectorAll('.admin-campaign-titulo')].map((el) => el.textContent);

  const renderThree = async () => {
    mockFetchCampaigns.mockResolvedValue({ data: THREE, error: null });
    renderAdmin();
    await waitFor(() => screen.getByText('Primera'));
  };

  it('renders the campaigns in the order they arrive', async () => {
    await renderThree();
    expect(titlesInOrder()).toEqual(['Primera', 'Segunda', 'Tercera']);
  });

  it('moves a campaign up when its up arrow is clicked', async () => {
    const user = userEvent.setup();
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Segunda', 'Primera', 'Tercera']));
  });

  it('moves a campaign down when its down arrow is clicked', async () => {
    const user = userEvent.setup();
    await renderThree();
    await user.click(screen.getByRole('button', { name: /bajar segunda/i }));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Primera', 'Tercera', 'Segunda']));
  });

  // The positions written are the destination indices, not the rows' stored
  // orden. Moving "Segunda" (index 1) up means it takes position 0 and the row
  // it displaced takes position 1.
  it('writes the destination positions of both campaigns', async () => {
    const user = userEvent.setup();
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(mockSwapOrder).toHaveBeenCalled());
    const [moved, displaced, ordenMoved, ordenDisplaced] = mockSwapOrder.mock.calls[0];
    expect(moved.id).toBe('c2');
    expect(displaced.id).toBe('c1');
    expect(ordenMoved).toBe(0);
    expect(ordenDisplaced).toBe(1);
  });

  it('disables the up arrow on the first campaign', async () => {
    await renderThree();
    expect(screen.getByRole('button', { name: /subir primera/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /bajar primera/i })).toBeEnabled();
  });

  it('disables the down arrow on the last campaign', async () => {
    await renderThree();
    expect(screen.getByRole('button', { name: /bajar tercera/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /subir tercera/i })).toBeEnabled();
  });

  it('disables both arrows when there is only one campaign', async () => {
    mockFetchCampaigns.mockResolvedValue({ data: [campaign({ titulo: 'Sola' })], error: null });
    renderAdmin();
    await waitFor(() => screen.getByText('Sola'));
    expect(screen.getByRole('button', { name: /subir sola/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /bajar sola/i })).toBeDisabled();
  });

  // The row moves before the write resolves, so the buttons feel immediate.
  it('moves the row before the write resolves', async () => {
    const user = userEvent.setup();
    let release;
    mockSwapOrder.mockReturnValue(new Promise((resolve) => { release = () => resolve({ error: null }); }));
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Segunda', 'Primera', 'Tercera']));
    release();
  });

  // A failed swap must not leave the panel showing an order the database does
  // not have, so the component refetches.
  it('reports the error and refetches when the swap fails', async () => {
    const user = userEvent.setup();
    mockSwapOrder.mockResolvedValue({ error: 'No se pudo cambiar el orden de las campañas.' });
    await renderThree();
    expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cambiar el orden/i));
    await waitFor(() => expect(mockFetchCampaigns).toHaveBeenCalledTimes(2));
  });

  // The refetch returns the unchanged server order, which must win over the
  // optimistic move that failed.
  it('restores the server order after a failed swap', async () => {
    const user = userEvent.setup();
    mockSwapOrder.mockResolvedValue({ error: 'No se pudo cambiar el orden de las campañas.' });
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Primera', 'Segunda', 'Tercera']));
  });

  // Two clicks landing before the first write resolves would compute their
  // positions from the same starting list and write conflicting values.
  it('ignores a second move while one is still in flight', async () => {
    const user = userEvent.setup();
    let release;
    mockSwapOrder.mockReturnValue(new Promise((resolve) => { release = () => resolve({ error: null }); }));
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Segunda', 'Primera', 'Tercera']));
    await user.click(screen.getByRole('button', { name: /bajar segunda/i }));
    expect(mockSwapOrder).toHaveBeenCalledTimes(1);
    release();
  });

  it('allows a second move once the first has finished', async () => {
    const user = userEvent.setup();
    await renderThree();
    await user.click(screen.getByRole('button', { name: /subir segunda/i }));
    await waitFor(() => expect(mockSwapOrder).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: /bajar segunda/i }));
    await waitFor(() => expect(mockSwapOrder).toHaveBeenCalledTimes(2));
    expect(titlesInOrder()).toEqual(['Primera', 'Segunda', 'Tercera']);
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

describe('hiding a campaign', () => {
  // Hiding confirms, so every test that hides has to answer the dialog.
  // jsdom's window.confirm throws "not implemented" if left unstubbed, which
  // would fail as a crash rather than as the assertion under test.
  const answerConfirm = (accept) =>
    vi.spyOn(window, 'confirm').mockReturnValue(accept);

  const card = () => document.querySelector('.admin-campaign-card');

  const renderOne = async (over = {}) => {
    mockFetchCampaigns.mockResolvedValue({ data: [campaign(over)], error: null });
    renderAdmin();
    await waitFor(() => screen.getByText('Tormenta'));
  };

  it('offers "Ocultar" on a visible campaign', async () => {
    await renderOne();
    expect(screen.getByRole('button', { name: /^ocultar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^mostrar$/i })).toBeNull();
  });

  it('offers "Mostrar" on a hidden campaign', async () => {
    await renderOne({ visible: false });
    expect(screen.getByRole('button', { name: /^mostrar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ocultar$/i })).toBeNull();
  });

  it('writes visible = false when hiding is confirmed', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(mockSetVisibility).toHaveBeenCalledWith('c1', false));
  });

  // Hiding pulls a campaign, its missions and its badges off the public site,
  // so a misclick must be recoverable before it happens, not after.
  it('writes nothing when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    answerConfirm(false);
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    expect(mockSetVisibility).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^ocultar$/i })).toBeInTheDocument();
  });

  // Un-hiding restores something; nobody needs protecting from that.
  it('does not confirm when showing a hidden campaign', async () => {
    const user = userEvent.setup();
    const confirm = answerConfirm(true);
    await renderOne({ visible: false });
    await user.click(screen.getByRole('button', { name: /^mostrar$/i }));
    await waitFor(() => expect(mockSetVisibility).toHaveBeenCalledWith('c1', true));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('warns how many players lose their badge from view', async () => {
    const user = userEvent.setup();
    const confirm = answerConfirm(false);
    mockFetchTitles.mockResolvedValue({ data: new Map([['c1', new Set(['p1', 'p2'])]]), error: null });
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    expect(confirm.mock.calls[0][0]).toMatch(/insignias de 2 jugadores/i);
  });

  it('leaves the badge sentence out when nobody has been granted one', async () => {
    const user = userEvent.setup();
    const confirm = answerConfirm(false);
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    expect(confirm.mock.calls[0][0]).not.toMatch(/insignias/i);
  });

  it('marks the card as hidden without waiting for the write', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    let release;
    mockSetVisibility.mockReturnValue(new Promise((resolve) => { release = () => resolve({ error: null }); }));
    await renderOne();
    expect(card()).not.toHaveClass('admin-campaign-card-hidden');
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(card()).toHaveClass('admin-campaign-card-hidden'));
    expect(screen.getByText(/^oculta$/i)).toBeInTheDocument();
    release();
  });

  it('drops the hidden marking when the campaign is shown again', async () => {
    const user = userEvent.setup();
    await renderOne({ visible: false });
    expect(card()).toHaveClass('admin-campaign-card-hidden');
    await user.click(screen.getByRole('button', { name: /^mostrar$/i }));
    await waitFor(() => expect(card()).not.toHaveClass('admin-campaign-card-hidden'));
    expect(screen.queryByText(/^oculta$/i)).toBeNull();
  });

  it('confirms the change with a message', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(screen.getByText(/campaña oculta/i)).toBeInTheDocument());
  });

  // A failed write must not leave the panel showing a state the database does
  // not have - the same rule the reorder buttons follow.
  it('reports the error and refetches when the write fails', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    mockSetVisibility.mockResolvedValue({ error: 'No se pudo cambiar la visibilidad de la campaña.' });
    await renderOne();
    expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cambiar la visibilidad/i));
    await waitFor(() => expect(mockFetchCampaigns).toHaveBeenCalledTimes(2));
  });

  it('restores the server state after a failed write', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    mockSetVisibility.mockResolvedValue({ error: 'No se pudo cambiar la visibilidad de la campaña.' });
    await renderOne();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(card()).not.toHaveClass('admin-campaign-card-hidden'));
    expect(screen.getByRole('button', { name: /^ocultar$/i })).toBeInTheDocument();
  });

  // A hidden campaign is still fully editable in the panel - that is the whole
  // point of hiding instead of deleting. Nothing may be disabled by hiding.
  it('keeps a hidden campaign editable, reorderable and manageable', async () => {
    const user = userEvent.setup();
    await renderOne({ visible: false });
    expect(screen.getByRole('button', { name: /editar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /gestionar/i }));
    expect(screen.getByRole('button', { name: /nueva misión/i })).toBeInTheDocument();
  });

  // The panel patches the single row instead of reloading, so an admin hiding
  // several campaigns in a row does not lose the card they have expanded.
  it('does not refetch or collapse the expanded card on a successful toggle', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    await renderOne();
    await user.click(screen.getByRole('button', { name: /gestionar/i }));
    expect(screen.getByRole('button', { name: /nueva misión/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^ocultar$/i }));
    await waitFor(() => expect(mockSetVisibility).toHaveBeenCalled());
    expect(mockFetchCampaigns).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /nueva misión/i })).toBeInTheDocument();
  });

  // Only the toggled campaign changes. A patch keyed on the wrong id would
  // hide the whole list, which is exactly the kind of bug a one-campaign test
  // cannot see.
  it('hides only the campaign whose button was clicked', async () => {
    const user = userEvent.setup();
    answerConfirm(true);
    mockFetchCampaigns.mockResolvedValue({
      data: [campaign({ id: 'c1', titulo: 'Primera' }), campaign({ id: 'c2', titulo: 'Segunda' })],
      error: null,
    });
    renderAdmin();
    await waitFor(() => screen.getByText('Primera'));
    await user.click(screen.getAllByRole('button', { name: /^ocultar$/i })[1]);
    await waitFor(() => expect(mockSetVisibility).toHaveBeenCalledWith('c2', false));
    const cards = document.querySelectorAll('.admin-campaign-card');
    expect(cards[0]).not.toHaveClass('admin-campaign-card-hidden');
    expect(cards[1]).toHaveClass('admin-campaign-card-hidden');
  });

  // The collapse button used to read "Ocultar" too. Two buttons with the same
  // label on one card, one cosmetic and one with public consequences, is a
  // misclick waiting to happen - so the collapse one says "Cerrar".
  it('does not label the collapse button "Ocultar"', async () => {
    const user = userEvent.setup();
    await renderOne();
    await user.click(screen.getByRole('button', { name: /gestionar/i }));
    expect(screen.getByRole('button', { name: /^cerrar$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^ocultar$/i })).toHaveLength(1);
  });

  // Before 0011 is applied the column does not exist, so the row arrives with
  // no `visible` key at all. That must read as visible, not as hidden - an
  // undefined flag greying out every card would look like total data loss.
  it('treats a campaign with no visible column as visible', async () => {
    const noColumn = campaign();
    delete noColumn.visible;
    mockFetchCampaigns.mockResolvedValue({ data: [noColumn], error: null });
    renderAdmin();
    await waitFor(() => screen.getByText('Tormenta'));
    expect(card()).not.toHaveClass('admin-campaign-card-hidden');
    expect(screen.getByRole('button', { name: /^ocultar$/i })).toBeInTheDocument();
  });
});
