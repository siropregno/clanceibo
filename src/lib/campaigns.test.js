import { describe, it, expect, vi, beforeEach } from 'vitest';

// One shared mock builder. Every method returns the builder itself so any
// chain shape works; the terminal value is whatever `result` is set to, and
// the builder is thenable so `await` on a non-terminated chain resolves too.
let result;
const calls = [];
const builder = {
  select: (...a) => { calls.push(['select', ...a]); return builder; },
  eq: (...a) => { calls.push(['eq', ...a]); return builder; },
  order: (...a) => { calls.push(['order', ...a]); return builder; },
  insert: (...a) => { calls.push(['insert', ...a]); return builder; },
  delete: (...a) => { calls.push(['delete', ...a]); return builder; },
  single: (...a) => { calls.push(['single', ...a]); return builder; },
  then: (resolve) => Promise.resolve(result).then(resolve),
};

vi.mock('@lib/supabaseClient', () => ({
  supabase: { from: (table) => { calls.push(['from', table]); return builder; } },
}));

import {
  sortMissions,
  fetchCampaigns,
  fetchCampaignWithMissions,
  fetchCampaignsWithMissions,
  fetchPlayerCampaigns,
  fetchTitlesByCampaign,
  grantTitle,
  revokeTitle,
} from './campaigns';

beforeEach(() => { calls.length = 0; result = { data: null, error: null }; });

describe('sortMissions', () => {
  it('orders missions oldest first regardless of input order', () => {
    const out = sortMissions({
      id: 'c1',
      missions: [
        { id: 'm2', fecha: '2026-03-10' },
        { id: 'm1', fecha: '2026-01-05' },
        { id: 'm3', fecha: '2026-07-22' },
      ],
    });
    expect(out.missions.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('does not mutate the campaign it is given', () => {
    const campaign = { id: 'c1', missions: [{ id: 'm2', fecha: '2026-03-10' }, { id: 'm1', fecha: '2026-01-05' }] };
    sortMissions(campaign);
    expect(campaign.missions.map((m) => m.id)).toEqual(['m2', 'm1']);
  });

  it('passes through a campaign with no missions key', () => {
    expect(sortMissions({ id: 'c1' })).toEqual({ id: 'c1' });
  });

  it('passes through an empty missions array', () => {
    expect(sortMissions({ id: 'c1', missions: [] }).missions).toEqual([]);
  });

  it('handles null without throwing', () => {
    expect(sortMissions(null)).toBeNull();
  });

  // ISO dates (yyyy-mm-dd) sort correctly as plain strings, which is why
  // localeCompare is used instead of constructing Date objects. This pins
  // that assumption: a same-year, cross-month pair must not sort lexically
  // wrong (e.g. '10' before '9' would break a non-padded format).
  it('sorts ISO dates across month boundaries', () => {
    const out = sortMissions({
      missions: [{ id: 'b', fecha: '2026-10-01' }, { id: 'a', fecha: '2026-09-30' }],
    });
    expect(out.missions.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('fetchCampaigns', () => {
  it('returns the rows on success', async () => {
    result = { data: [{ id: 'c1', titulo: 'Tormenta' }], error: null };
    const { data, error } = await fetchCampaigns();
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'c1', titulo: 'Tormenta' }]);
  });

  it('orders by start date, newest first, undated last', async () => {
    result = { data: [], error: null };
    await fetchCampaigns();
    const order = calls.find(([m]) => m === 'order');
    expect(order[1]).toBe('fecha_inicio');
    expect(order[2]).toMatchObject({ ascending: false, nullsFirst: false });
  });

  it('returns an empty array, not null, when there are no campaigns', async () => {
    result = { data: null, error: null };
    const { data, error } = await fetchCampaigns();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('converts a Supabase error into a user-facing message', async () => {
    result = { data: null, error: { message: 'network' } };
    const { data, error } = await fetchCampaigns();
    expect(data).toBeNull();
    expect(error).toMatch(/no se pudieron cargar las campañas/i);
  });
});

describe('fetchCampaignWithMissions', () => {
  it('embeds missions and sorts them oldest first', async () => {
    result = {
      data: { id: 'c1', missions: [{ id: 'm2', fecha: '2026-05-01' }, { id: 'm1', fecha: '2026-04-01' }] },
      error: null,
    };
    const { data } = await fetchCampaignWithMissions('c1');
    expect(data.missions.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(calls).toContainEqual(['select', '*, missions(*)']);
    expect(calls).toContainEqual(['eq', 'id', 'c1']);
  });

  it('reports an error for a campaign that does not exist', async () => {
    result = { data: null, error: { message: 'no rows' } };
    const { data, error } = await fetchCampaignWithMissions('nope');
    expect(data).toBeNull();
    expect(error).toMatch(/no se pudo cargar la campaña/i);
  });
});

describe('fetchCampaignsWithMissions', () => {
  it('sorts the missions of every campaign', async () => {
    result = {
      data: [
        { id: 'c1', missions: [{ id: 'm2', fecha: '2026-02-01' }, { id: 'm1', fecha: '2026-01-01' }] },
        { id: 'c2', missions: [{ id: 'm4', fecha: '2026-06-01' }, { id: 'm3', fecha: '2026-05-01' }] },
      ],
      error: null,
    };
    const { data } = await fetchCampaignsWithMissions();
    expect(data[0].missions.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(data[1].missions.map((m) => m.id)).toEqual(['m3', 'm4']);
  });

  it('handles a campaign with no missions', async () => {
    result = { data: [{ id: 'c1', missions: [] }], error: null };
    const { data, error } = await fetchCampaignsWithMissions();
    expect(error).toBeNull();
    expect(data[0].missions).toEqual([]);
  });

  it('converts a Supabase error into a user-facing message', async () => {
    result = { data: null, error: { message: 'network' } };
    const { error } = await fetchCampaignsWithMissions();
    expect(error).toMatch(/no se pudieron cargar las campañas/i);
  });
});

describe('fetchPlayerCampaigns', () => {
  it('unwraps the embedded campaign off each title row', async () => {
    result = {
      data: [
        { campaign_id: 'c1', granted_at: '2026-07-01', campaigns: { id: 'c1', titulo: 'Tormenta' } },
        { campaign_id: 'c2', granted_at: '2026-06-01', campaigns: { id: 'c2', titulo: 'Relámpago' } },
      ],
      error: null,
    };
    const { data } = await fetchPlayerCampaigns('p1');
    expect(data).toEqual([{ id: 'c1', titulo: 'Tormenta' }, { id: 'c2', titulo: 'Relámpago' }]);
    expect(calls).toContainEqual(['eq', 'player_id', 'p1']);
  });

  it('drops rows whose embedded campaign is missing', async () => {
    result = { data: [{ campaign_id: 'c1', campaigns: null }], error: null };
    const { data } = await fetchPlayerCampaigns('p1');
    expect(data).toEqual([]);
  });

  it('returns an empty array for a player with no campaigns', async () => {
    result = { data: [], error: null };
    const { data, error } = await fetchPlayerCampaigns('p1');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('converts a Supabase error into a user-facing message', async () => {
    result = { data: null, error: { message: 'network' } };
    const { error } = await fetchPlayerCampaigns('p1');
    expect(error).toMatch(/no se pudieron cargar las campañas del jugador/i);
  });
});

describe('fetchTitlesByCampaign', () => {
  it('groups player ids into a Set per campaign', async () => {
    result = {
      data: [
        { campaign_id: 'c1', player_id: 'p1' },
        { campaign_id: 'c1', player_id: 'p2' },
        { campaign_id: 'c2', player_id: 'p1' },
      ],
      error: null,
    };
    const { data } = await fetchTitlesByCampaign();
    expect(data.get('c1')).toEqual(new Set(['p1', 'p2']));
    expect(data.get('c2')).toEqual(new Set(['p1']));
  });

  it('returns an empty map when nothing has been granted', async () => {
    result = { data: [], error: null };
    const { data, error } = await fetchTitlesByCampaign();
    expect(error).toBeNull();
    expect(data.size).toBe(0);
  });

  it('leaves campaigns with no grants absent from the map', async () => {
    result = { data: [{ campaign_id: 'c1', player_id: 'p1' }], error: null };
    const { data } = await fetchTitlesByCampaign();
    expect(data.has('c2')).toBe(false);
  });

  it('converts a Supabase error into a user-facing message', async () => {
    result = { data: null, error: { message: 'network' } };
    const { data, error } = await fetchTitlesByCampaign();
    expect(data).toBeNull();
    expect(error).toMatch(/no se pudieron cargar/i);
  });
});

describe('grantTitle', () => {
  it('inserts the campaign/player pair', async () => {
    result = { error: null };
    const { error } = await grantTitle('c1', 'p1');
    expect(error).toBeNull();
    expect(calls).toContainEqual(['insert', { campaign_id: 'c1', player_id: 'p1' }]);
  });

  it('reports a failure as a user-facing message', async () => {
    result = { error: { message: 'rls' } };
    const { error } = await grantTitle('c1', 'p1');
    expect(error).toMatch(/no se pudo otorgar/i);
  });
});

describe('revokeTitle', () => {
  it('deletes by both keys, not just the campaign', async () => {
    result = { error: null };
    const { error } = await revokeTitle('c1', 'p1');
    expect(error).toBeNull();
    expect(calls).toContainEqual(['eq', 'campaign_id', 'c1']);
    expect(calls).toContainEqual(['eq', 'player_id', 'p1']);
  });

  it('reports a failure as a user-facing message', async () => {
    result = { error: { message: 'rls' } };
    const { error } = await revokeTitle('c1', 'p1');
    expect(error).toMatch(/no se pudo quitar/i);
  });
});
