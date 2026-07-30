import { supabase } from '@lib/supabaseClient';

// Every campaigns/missions/titles query lives here so the pages don't each
// hand-roll a Supabase call and drift apart on column lists or ordering.
//
// Each function returns { data, error } like the Supabase client itself,
// with `error` already turned into a Spanish user-facing string (or null).
// Callers render `error` directly and never see a PostgrestError.

const ERR_CAMPAIGNS = 'No se pudieron cargar las campañas.';
const ERR_CAMPAIGN = 'No se pudo cargar la campaña.';
const ERR_TITLES = 'No se pudieron cargar las campañas del jugador.';
const ERR_REORDER = 'No se pudo cambiar el orden de las campañas.';
const ERR_VISIBILITY = 'No se pudo cambiar la visibilidad de la campaña.';

// Campaigns are ordered by campaigns.orden ascending: an explicit position an
// admin sets in the panel (0010). created_at desc is the tiebreaker, not a
// cosmetic touch - orden is deliberately not unique (see 0010), so without a
// second key two campaigns sharing a position would come back in whatever
// order Postgres felt like, and could swap places between two page loads.
// Newest-first as the tiebreaker matches how the list was ordered before
// orden existed, so a fresh campaign left at the default 0 lands on top.
const CAMPAIGN_ORDER = [
  { column: 'orden', ascending: true },
  { column: 'created_at', ascending: false },
];

// Applies CAMPAIGN_ORDER to a PostgREST query builder. Both list queries need
// the identical two-key ordering, and an `.order()` dropped from one of them
// is the kind of bug that only shows up as "the public page disagrees with
// the admin panel", so neither spells it out by hand.
const applyCampaignOrder = (query) =>
  CAMPAIGN_ORDER.reduce((q, { column, ascending }) => q.order(column, { ascending }), query);

// PostgREST does not order embedded rows the way `.order()` orders the
// parent, so missions come back in an unspecified order. Sorting here keeps
// every caller consistent (oldest mission first: a campaign reads as a
// story in the order its missions were added, unlike the campaign list
// itself which is newest-first).
export const sortMissions = (campaign) => {
  if (!campaign?.missions) return campaign;
  const missions = [...campaign.missions].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { ...campaign, missions };
};

// The campaign list. Asks for a mission COUNT rather than the mission rows:
// the list card only shows "N misiones", so embedding every mission would
// pull the whole tree down for a page that renders none of it.
//
// PostgREST returns that count as missions: [{ count: n }], which is awkward
// for callers, so it is flattened to a plain mission_count number here.
export const fetchCampaigns = async () => {
  const { data, error } = await applyCampaignOrder(
    supabase.from('campaigns').select('*, missions(count)'),
  );
  if (error) return { data: null, error: ERR_CAMPAIGNS };
  return { data: (data || []).map(withMissionCount), error: null };
};

export const withMissionCount = (campaign) => {
  const { missions, ...rest } = campaign;
  return { ...rest, mission_count: missions?.[0]?.count ?? 0 };
};

// One campaign plus its missions, for the campaign detail view. The embedded
// select relies on the missions.campaign_id foreign key: PostgREST resolves
// `missions(*)` into a nested array on each campaign row, which is one round
// trip instead of two.
export const fetchCampaignWithMissions = async (campaignId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, missions(*)')
    .eq('id', campaignId)
    .single();
  if (error) return { data: null, error: ERR_CAMPAIGN };
  return { data: sortMissions(data), error: null };
};

// All campaigns with their missions, for the public /campanas list.
export const fetchCampaignsWithMissions = async () => {
  const { data, error } = await applyCampaignOrder(
    supabase.from('campaigns').select('*, missions(*)'),
  );
  if (error) return { data: null, error: ERR_CAMPAIGNS };
  return { data: (data || []).map(sortMissions), error: null };
};

// ── Reordering ─────────────────────────────────────────────────────────

// Given the campaign list as currently displayed, returns the pair of rows a
// move at `index` would exchange positions, or null if the move runs off the
// end of the list. Pure and exported so the arithmetic is testable without a
// database: the off-by-one at the list edges is the whole risk here.
//
// direction is -1 (up, toward the top) or 1 (down).
export const neighborSwap = (campaigns, index, direction) => {
  if (!Array.isArray(campaigns)) return null;
  const target = index + direction;
  if (index < 0 || index >= campaigns.length) return null;
  if (target < 0 || target >= campaigns.length) return null;
  return { a: campaigns[index], b: campaigns[target] };
};

// Returns the list with `index` moved one step in `direction`, without
// mutating the input. This is what the panel renders immediately: waiting for
// two round trips before the row visibly moves makes the button feel broken,
// and a failed swap re-fetches anyway.
export const reorderLocally = (campaigns, index, direction) => {
  const pair = neighborSwap(campaigns, index, direction);
  if (!pair) return campaigns;
  const next = [...campaigns];
  const target = index + direction;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// Exchanges the `orden` of two campaigns.
//
// Two campaigns can share an `orden` value (every row starts at the default 0
// before an admin ever reorders, and 0010 does not make the column unique).
// A blind value swap between two rows that both sit at 0 is a no-op, and the
// pair would never separate. So the positions are normalised first: whatever
// the stored values are, the pair ends up with the two distinct positions
// they should occupy, derived from their current place in the list.
//
// The two UPDATEs are not a transaction - PostgREST has no client-side
// transaction, and adding an RPC for a two-row swap on a table this small is
// not worth the extra migration surface. If the second fails, both rows may
// hold the same orden; the created_at tiebreaker keeps the list stable and
// deterministic rather than flickering, and the admin's next move fixes it.
// The caller reloads on error so the panel never shows a state the database
// does not have.
// ordenA/ordenB are the positions the two rows should end up holding, which
// the caller takes from their index in the displayed list - not from the rows'
// stored `orden`, for the duplicate-value reason above.
export const swapCampaignOrder = async (a, b, ordenA, ordenB) => {
  const [resA, resB] = await Promise.all([
    supabase.from('campaigns').update({ orden: ordenA }).eq('id', a.id),
    supabase.from('campaigns').update({ orden: ordenB }).eq('id', b.id),
  ]);
  if (resA.error || resB.error) return { error: ERR_REORDER };
  return { error: null };
};

// ── Visibility ─────────────────────────────────────────────────────────

// Shows or hides a campaign on the public site (0011).
//
// This writes a flag and nothing else. The hiding itself happens in the
// database: campaigns_select_public only returns rows where `visible` is true
// (or the caller is an admin), so a hidden campaign stops being served to the
// public list, to its own detail page, and - through the embedded campaigns(*)
// that fetchPlayerCampaigns reads - to the badge row on every player profile.
// There is deliberately no `.eq('visible', true)` anywhere in this file: the
// anon key ships in the bundle, so a client-side filter would hide the
// campaign from the page while still serving it to anyone calling PostgREST
// directly. Nothing is deleted, so un-hiding restores all of it.
//
// `visible` is the value the campaign should END UP with, not a delta, so a
// double click cannot toggle it back and forth against a stale row.
export const setCampaignVisibility = async (campaignId, visible) => {
  const { error } = await supabase
    .from('campaigns')
    .update({ visible })
    .eq('id', campaignId);
  return { error: error ? ERR_VISIBILITY : null };
};

// The campaign badges a single player has been granted, for their profile.
// Embeds the campaign so the caller gets titulo/badge_url without a second
// query. Rows whose campaign was deleted cannot exist (FK cascade), so the
// embedded object is always present.
export const fetchPlayerCampaigns = async (playerId) => {
  const { data, error } = await supabase
    .from('campaign_titles')
    .select('campaign_id, granted_at, campaigns(*)')
    .eq('player_id', playerId)
    .order('granted_at', { ascending: false });
  if (error) return { data: null, error: ERR_TITLES };
  return { data: (data || []).map((row) => row.campaigns).filter(Boolean), error: null };
};

// Every granted title, keyed for the admin panel: campaign_id -> Set of
// player ids. A Set (not an array) because the panel's only question is
// "does this player have this badge", asked once per player per render.
export const fetchTitlesByCampaign = async () => {
  const { data, error } = await supabase.from('campaign_titles').select('campaign_id, player_id');
  if (error) return { data: null, error: ERR_TITLES };
  const byCampaign = new Map();
  for (const { campaign_id, player_id } of data || []) {
    if (!byCampaign.has(campaign_id)) byCampaign.set(campaign_id, new Set());
    byCampaign.get(campaign_id).add(player_id);
  }
  return { data: byCampaign, error: null };
};

export const grantTitle = async (campaignId, playerId) => {
  const { error } = await supabase
    .from('campaign_titles')
    .insert({ campaign_id: campaignId, player_id: playerId });
  return { error: error ? 'No se pudo otorgar la campaña.' : null };
};

export const revokeTitle = async (campaignId, playerId) => {
  const { error } = await supabase
    .from('campaign_titles')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('player_id', playerId);
  return { error: error ? 'No se pudo quitar la campaña.' : null };
};
