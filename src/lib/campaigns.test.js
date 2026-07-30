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
  update: (...a) => { calls.push(['update', ...a]); return builder; },
  delete: (...a) => { calls.push(['delete', ...a]); return builder; },
  single: (...a) => { calls.push(['single', ...a]); return builder; },
  then: (resolve) => Promise.resolve(result).then(resolve),
};

vi.mock('@lib/supabaseClient', () => ({
  supabase: { from: (table) => { calls.push(['from', table]); return builder; } },
}));

import {
  sortMissions,
  withMissionCount,
  fetchCampaigns,
  fetchCampaignWithMissions,
  fetchCampaignsWithMissions,
  fetchPlayerCampaigns,
  fetchTitlesByCampaign,
  grantTitle,
  revokeTitle,
  neighborSwap,
  reorderLocally,
  swapCampaignOrder,
  setCampaignVisibility,
} from './campaigns';

beforeEach(() => { calls.length = 0; result = { data: null, error: null }; });

describe('sortMissions', () => {
  it('orders missions oldest first regardless of input order', () => {
    const out = sortMissions({
      id: 'c1',
      missions: [
        { id: 'm2', created_at: '2026-03-10T00:00:00Z' },
        { id: 'm1', created_at: '2026-01-05T00:00:00Z' },
        { id: 'm3', created_at: '2026-07-22T00:00:00Z' },
      ],
    });
    expect(out.missions.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('does not mutate the campaign it is given', () => {
    const campaign = { id: 'c1', missions: [{ id: 'm2', created_at: '2026-03-10T00:00:00Z' }, { id: 'm1', created_at: '2026-01-05T00:00:00Z' }] };
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

  // ISO timestamps sort correctly as plain strings, which is why
  // localeCompare is used instead of constructing Date objects. This pins
  // that assumption at a month boundary, where a non-padded format would
  // sort '10' before '9'.
  it('sorts ISO timestamps across month boundaries', () => {
    const out = sortMissions({
      missions: [{ id: 'b', created_at: '2026-10-01T00:00:00Z' }, { id: 'a', created_at: '2026-09-30T00:00:00Z' }],
    });
    expect(out.missions.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('withMissionCount', () => {
  // PostgREST returns an embedded count as missions: [{ count: n }]. Callers
  // want a number, and they must not receive a half-populated `missions` key
  // that looks like the real mission rows.
  it('flattens the embedded count into a number', () => {
    expect(withMissionCount({ id: 'c1', missions: [{ count: 3 }] }))
      .toEqual({ id: 'c1', mission_count: 3 });
  });

  it('reports zero when the campaign has no missions', () => {
    expect(withMissionCount({ id: 'c1', missions: [] }).mission_count).toBe(0);
  });

  it('reports zero when the embed is missing entirely', () => {
    expect(withMissionCount({ id: 'c1' }).mission_count).toBe(0);
  });

  it('drops the raw missions key so it cannot be mistaken for mission rows', () => {
    expect(withMissionCount({ id: 'c1', missions: [{ count: 2 }] })).not.toHaveProperty('missions');
  });

  it('keeps the rest of the campaign intact', () => {
    const out = withMissionCount({ id: 'c1', titulo: 'Tormenta', badge_url: 'x', missions: [{ count: 1 }] });
    expect(out).toMatchObject({ id: 'c1', titulo: 'Tormenta', badge_url: 'x', mission_count: 1 });
  });
});

describe('fetchCampaigns', () => {
  it('returns the rows on success, with the count flattened', async () => {
    result = { data: [{ id: 'c1', titulo: 'Tormenta', missions: [{ count: 4 }] }], error: null };
    const { data, error } = await fetchCampaigns();
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'c1', titulo: 'Tormenta', mission_count: 4 }]);
  });

  // Asking for missions(count) instead of missions(*) keeps the list page
  // from downloading every mission row it never renders.
  it('asks for a mission count, not the mission rows', async () => {
    result = { data: [], error: null };
    await fetchCampaigns();
    expect(calls).toContainEqual(['select', '*, missions(count)']);
  });

  // 0010 made the display order an admin-editable column. `orden` leads;
  // created_at desc is the tiebreaker, and both keys must be present in that
  // sequence - PostgREST applies .order() calls in the order they are made,
  // so a swapped pair here would sort by date and ignore the admin's order.
  it('orders by orden first, then newest created_at', async () => {
    result = { data: [], error: null };
    await fetchCampaigns();
    const orders = calls.filter(([m]) => m === 'order');
    expect(orders).toHaveLength(2);
    expect(orders[0][1]).toBe('orden');
    expect(orders[0][2]).toMatchObject({ ascending: true });
    expect(orders[1][1]).toBe('created_at');
    expect(orders[1][2]).toMatchObject({ ascending: false });
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
      data: { id: 'c1', missions: [{ id: 'm2', created_at: '2026-05-01T00:00:00Z' }, { id: 'm1', created_at: '2026-04-01T00:00:00Z' }] },
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
        { id: 'c1', missions: [{ id: 'm2', created_at: '2026-02-01T00:00:00Z' }, { id: 'm1', created_at: '2026-01-01T00:00:00Z' }] },
        { id: 'c2', missions: [{ id: 'm4', created_at: '2026-06-01T00:00:00Z' }, { id: 'm3', created_at: '2026-05-01T00:00:00Z' }] },
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

  // The admin panel reads this one and the public page reads fetchCampaigns.
  // If their orderings drift, an admin reorders the list and the public page
  // shows something else - a bug that is invisible in either page alone.
  it('orders identically to the public campaign list', async () => {
    result = { data: [], error: null };
    await fetchCampaignsWithMissions();
    const withMissions = calls.filter(([m]) => m === 'order');
    calls.length = 0;
    await fetchCampaigns();
    const list = calls.filter(([m]) => m === 'order');
    expect(withMissions).toEqual(list);
  });
});

describe('neighborSwap', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('pairs a row with the one above it when moving up', () => {
    expect(neighborSwap(list, 1, -1)).toEqual({ a: { id: 'b' }, b: { id: 'a' } });
  });

  it('pairs a row with the one below it when moving down', () => {
    expect(neighborSwap(list, 1, 1)).toEqual({ a: { id: 'b' }, b: { id: 'c' } });
  });

  // The list edges are where an off-by-one would show up as a swap with
  // undefined, so both ends are pinned explicitly.
  it('refuses to move the first row up', () => {
    expect(neighborSwap(list, 0, -1)).toBeNull();
  });

  it('refuses to move the last row down', () => {
    expect(neighborSwap(list, 2, 1)).toBeNull();
  });

  it('refuses an index outside the list', () => {
    expect(neighborSwap(list, 9, -1)).toBeNull();
    expect(neighborSwap(list, -1, 1)).toBeNull();
  });

  it('returns null for a single-item list in either direction', () => {
    expect(neighborSwap([{ id: 'only' }], 0, -1)).toBeNull();
    expect(neighborSwap([{ id: 'only' }], 0, 1)).toBeNull();
  });

  it('returns null for an empty or missing list', () => {
    expect(neighborSwap([], 0, 1)).toBeNull();
    expect(neighborSwap(undefined, 0, 1)).toBeNull();
  });
});

describe('reorderLocally', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves a row up one position', () => {
    expect(reorderLocally(list, 1, -1).map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a row down one position', () => {
    expect(reorderLocally(list, 1, 1).map((c) => c.id)).toEqual(['a', 'c', 'b']);
  });

  it('moves the last row up', () => {
    expect(reorderLocally(list, 2, -1).map((c) => c.id)).toEqual(['a', 'c', 'b']);
  });

  // React state must not be mutated in place, or the re-render can be skipped
  // because the array identity never changed.
  it('does not mutate the list it is given', () => {
    reorderLocally(list, 1, -1);
    expect(list.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the list unchanged when the move is impossible', () => {
    expect(reorderLocally(list, 0, -1)).toBe(list);
  });

  // Moving a row down and then back up is the shape of an admin correcting a
  // misclick, and must land exactly where it started.
  it('round-trips back to the original order', () => {
    const down = reorderLocally(list, 0, 1);
    expect(reorderLocally(down, 1, -1).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('swapCampaignOrder', () => {
  it('writes the given position to each campaign', async () => {
    result = { error: null };
    const { error } = await swapCampaignOrder({ id: 'c1' }, { id: 'c2' }, 0, 1);
    expect(error).toBeNull();
    expect(calls).toContainEqual(['update', { orden: 0 }]);
    expect(calls).toContainEqual(['eq', 'id', 'c1']);
    expect(calls).toContainEqual(['update', { orden: 1 }]);
    expect(calls).toContainEqual(['eq', 'id', 'c2']);
  });

  // Positions come from the caller's list indices, never from the rows' own
  // stored orden. Two rows both sitting at the default 0 must still end up
  // with two different values, or they could never be separated.
  it('separates two campaigns that share an orden value', async () => {
    result = { error: null };
    await swapCampaignOrder({ id: 'c1', orden: 0 }, { id: 'c2', orden: 0 }, 1, 0);
    const written = calls.filter(([m]) => m === 'update').map(([, payload]) => payload.orden);
    expect(new Set(written).size).toBe(2);
    expect(written).toEqual(expect.arrayContaining([0, 1]));
  });

  it('reports a failure as a user-facing message', async () => {
    result = { error: { message: 'rls' } };
    const { error } = await swapCampaignOrder({ id: 'c1' }, { id: 'c2' }, 0, 1);
    expect(error).toMatch(/no se pudo cambiar el orden/i);
  });

  // The two updates are separate requests with no transaction around them, so
  // one can fail while the other commits. That half-applied state must be
  // reported as an error - the caller reloads on it, and swallowing it would
  // leave the panel showing a move the database only half made.
  //
  // The shared `result` cannot vary per call, so this test swaps in a builder
  // whose terminal value is drawn from a queue, one entry per update.
  it.each([
    ['the first update fails', [{ error: { message: 'rls' } }, { error: null }]],
    ['the second update fails', [{ error: null }, { error: { message: 'rls' } }]],
  ])('reports an error when %s', async (_label, queue) => {
    const pending = [...queue];
    const failing = {
      update: () => failing,
      eq: () => failing,
      then: (resolve) => Promise.resolve(pending.shift()).then(resolve),
    };
    const { supabase } = await import('@lib/supabaseClient');
    const originalFrom = supabase.from;
    supabase.from = () => failing;
    try {
      const { error } = await swapCampaignOrder({ id: 'c1' }, { id: 'c2' }, 0, 1);
      expect(error).toMatch(/no se pudo cambiar el orden/i);
    } finally {
      supabase.from = originalFrom;
    }
  });
});

describe('setCampaignVisibility', () => {
  it('hides a campaign by writing visible = false', async () => {
    result = { error: null };
    const { error } = await setCampaignVisibility('c1', false);
    expect(error).toBeNull();
    expect(calls).toContainEqual(['update', { visible: false }]);
    expect(calls).toContainEqual(['eq', 'id', 'c1']);
  });

  it('shows a campaign by writing visible = true', async () => {
    result = { error: null };
    await setCampaignVisibility('c1', true);
    expect(calls).toContainEqual(['update', { visible: true }]);
  });

  // The caller passes the desired end state, never a toggle. Two clicks
  // computed against a stale row would otherwise flip it back.
  it('writes only the visible column, leaving the rest of the row alone', async () => {
    result = { error: null };
    await setCampaignVisibility('c1', false);
    const updates = calls.filter(([m]) => m === 'update');
    expect(updates).toHaveLength(1);
    expect(Object.keys(updates[0][1])).toEqual(['visible']);
  });

  it('reports a failure as a user-facing message', async () => {
    result = { error: { message: 'rls' } };
    const { error } = await setCampaignVisibility('c1', false);
    expect(error).toMatch(/no se pudo cambiar la visibilidad/i);
  });
});

// Hidden campaigns are gated twice, and the two layers answer different
// questions.
//
// RLS (0011) is the security floor: a non-admin cannot select the row at all,
// so it is unreachable through PostgREST with the publishable key. That layer
// cannot be tested from here - it lives in the database - and nothing in this
// file may be mistaken for it.
//
// RLS keeps an admin branch so the panel can un-hide a campaign, which means
// an admin browsing the public pages WOULD still be served hidden campaigns.
// These tests pin the product rule that removes them: hidden means gone from
// the site for everyone, admins included.
describe('hidden campaigns are dropped from the public read paths', () => {
  const hidden = { id: 'c1', titulo: 'Oculta', visible: false };
  const shown = { id: 'c2', titulo: 'Visible', visible: true };

  it('fetchCampaigns drops hidden campaigns from the list', async () => {
    result = { data: [hidden, shown], error: null };
    const { data } = await fetchCampaigns();
    expect(data.map((c) => c.id)).toEqual(['c2']);
  });

  it('fetchCampaigns returns an empty list when every campaign is hidden', async () => {
    result = { data: [hidden], error: null };
    const { data, error } = await fetchCampaigns();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // The detail page renders a null campaign as "Campaña no encontrada", so a
  // hidden campaign reached by typing its URL has to produce exactly that -
  // for an admin too, whom RLS does serve the row to.
  it('fetchCampaignWithMissions reports a hidden campaign as not found', async () => {
    result = { data: { id: 'c1', titulo: 'Oculta', visible: false, missions: [] }, error: null };
    const { data, error } = await fetchCampaignWithMissions('c1');
    expect(data).toBeNull();
    expect(error).toMatch(/no se pudo cargar la campaña/i);
  });

  it('fetchCampaignWithMissions still returns a visible campaign', async () => {
    result = { data: { id: 'c2', titulo: 'Visible', visible: true, missions: [] }, error: null };
    const { data, error } = await fetchCampaignWithMissions('c2');
    expect(error).toBeNull();
    expect(data.id).toBe('c2');
  });

  // The reported bug: an admin viewing a profile still saw the medal of a
  // campaign they had hidden, because RLS served them the embedded row.
  it('fetchPlayerCampaigns drops the badge of a hidden campaign', async () => {
    result = {
      data: [
        { campaign_id: 'c1', campaigns: hidden },
        { campaign_id: 'c2', campaigns: shown },
      ],
      error: null,
    };
    const { data } = await fetchPlayerCampaigns('p1');
    expect(data.map((c) => c.id)).toEqual(['c2']);
  });

  it('fetchPlayerCampaigns returns nothing when every badge is hidden', async () => {
    result = { data: [{ campaign_id: 'c1', campaigns: hidden }], error: null };
    const { data, error } = await fetchPlayerCampaigns('p1');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // The admin panel is the one place a hidden campaign must still appear -
  // it is where it gets un-hidden. Filtering here would make hiding a
  // one-way door.
  it('fetchCampaignsWithMissions keeps hidden campaigns for the admin panel', async () => {
    result = { data: [{ ...hidden, missions: [] }, { ...shown, missions: [] }], error: null };
    const { data } = await fetchCampaignsWithMissions();
    expect(data.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  // A row from before 0011, or a select that did not ask for the column,
  // arrives with `visible` undefined. That must read as visible - treating it
  // as hidden would blank the public site.
  it.each([
    ['fetchCampaigns', async () => {
      result = { data: [{ id: 'c1', titulo: 'Sin columna' }], error: null };
      return (await fetchCampaigns()).data.length;
    }],
    ['fetchPlayerCampaigns', async () => {
      result = { data: [{ campaign_id: 'c1', campaigns: { id: 'c1', titulo: 'Sin columna' } }], error: null };
      return (await fetchPlayerCampaigns('p1')).data.length;
    }],
  ])('%s treats a campaign with no visible column as visible', async (_label, run) => {
    expect(await run()).toBe(1);
  });

  it('fetchCampaignWithMissions treats a campaign with no visible column as visible', async () => {
    result = { data: { id: 'c1', titulo: 'Sin columna', missions: [] }, error: null };
    const { data, error } = await fetchCampaignWithMissions('c1');
    expect(error).toBeNull();
    expect(data.id).toBe('c1');
  });

  // The client filter is a product rule layered on RLS, never a replacement.
  // Adding `.eq('visible', true)` to the query would look like the gate and
  // let someone relax the real one without the site appearing to change.
  it.each([
    ['fetchCampaigns', () => fetchCampaigns()],
    ['fetchCampaignWithMissions', () => fetchCampaignWithMissions('c1')],
    ['fetchPlayerCampaigns', () => fetchPlayerCampaigns('p1')],
  ])('%s filters in JS, not with a query predicate', async (_label, run) => {
    result = { data: [], error: null };
    await run();
    expect(calls.filter(([method]) => method === 'eq')
      .some(([, column]) => column === 'visible')).toBe(false);
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

  // This is how a hidden campaign's badge disappears from a profile (0011).
  // The campaign_titles row survives - nothing is deleted - but RLS returns
  // NULL for the embedded campaign to a non-admin, and the badge must not
  // render as an empty medal or throw on titulo.charAt(0) in CampaignBadge.
  it('drops rows whose embedded campaign is missing', async () => {
    result = { data: [{ campaign_id: 'c1', campaigns: null }], error: null };
    const { data } = await fetchPlayerCampaigns('p1');
    expect(data).toEqual([]);
  });

  it('keeps visible campaigns when a hidden one is filtered out beside them', async () => {
    result = {
      data: [
        { campaign_id: 'c1', campaigns: null },
        { campaign_id: 'c2', campaigns: { id: 'c2', titulo: 'Relámpago' } },
      ],
      error: null,
    };
    const { data } = await fetchPlayerCampaigns('p1');
    expect(data).toEqual([{ id: 'c2', titulo: 'Relámpago' }]);
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
