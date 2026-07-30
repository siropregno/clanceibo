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

// Campaigns are ordered newest-first by start date. fecha_inicio is
// nullable, so `nullsFirst: false` keeps undated campaigns at the bottom
// instead of letting them head the list.
const CAMPAIGN_ORDER = { column: 'fecha_inicio', ascending: false, nullsFirst: false };

// PostgREST does not order embedded rows the way `.order()` orders the
// parent, so missions come back in an unspecified order. Sorting here keeps
// every caller consistent (oldest mission first: a campaign reads as a
// chronological story, unlike the campaign list itself which is newest-first).
export const sortMissions = (campaign) => {
  if (!campaign?.missions) return campaign;
  const missions = [...campaign.missions].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { ...campaign, missions };
};

// The campaign list. Asks for a mission COUNT rather than the mission rows:
// the list card only shows "N misiones", so embedding every mission would
// pull the whole tree down for a page that renders none of it.
//
// PostgREST returns that count as missions: [{ count: n }], which is awkward
// for callers, so it is flattened to a plain mission_count number here.
export const fetchCampaigns = async () => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, missions(count)')
    .order(CAMPAIGN_ORDER.column, CAMPAIGN_ORDER);
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
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, missions(*)')
    .order(CAMPAIGN_ORDER.column, CAMPAIGN_ORDER);
  if (error) return { data: null, error: ERR_CAMPAIGNS };
  return { data: (data || []).map(sortMissions), error: null };
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
