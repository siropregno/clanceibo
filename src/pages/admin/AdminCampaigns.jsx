import React, { useCallback, useEffect, useState } from 'react';
import './admincampaigns.css';
import { supabase } from '@lib/supabaseClient';
import {
  fetchCampaignsWithMissions,
  fetchTitlesByCampaign,
  grantTitle,
  revokeTitle,
  neighborSwap,
  reorderLocally,
  swapCampaignOrder,
  setCampaignVisibility,
} from '@lib/campaigns';
import CampaignImageUpload from '@components/component-campaignimageupload/campaignimageupload';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';

const EMPTY_CAMPAIGN = { titulo: '', autor: '', descripcion: '', badge_url: null, badge_path: null };
const EMPTY_MISSION = { titulo: '', descripcion: '', mapa: '',
  imagen_url: null, imagen_path: null };

// Empty date inputs come back as '', which Postgres rejects for a date
// column. Every optional text field gets the same treatment so a blank stays
// NULL instead of becoming an empty string.
const nullIfBlank = (v) => (v && String(v).trim() ? String(v).trim() : null);

// players: the admin panel's already-fetched player list, reused here so
// this component does not run a second identical query.
const AdminCampaigns = ({ players }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [titles, setTitles] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);

  const [campaignForm, setCampaignForm] = useState(null); // null | EMPTY | existing row
  const [missionForm, setMissionForm] = useState(null);   // null | { campaign_id, ...mission }
  const [expandedId, setExpandedId] = useState(null);

  // `keepError` is for reloads that exist *because* something failed - a
  // rejected reorder resyncs the list, and a successful resync must not wipe
  // the message explaining why the row snapped back. A fetch error still
  // wins, since that is the more immediate problem.
  const load = useCallback(async ({ keepError = false } = {}) => {
    setLoading(true);
    const [campaignsRes, titlesRes] = await Promise.all([
      fetchCampaignsWithMissions(),
      fetchTitlesByCampaign(),
    ]);
    const fetchError = campaignsRes.error || titlesRes.error;
    setError((prev) => fetchError || (keepError ? prev : null));
    setCampaigns(campaignsRes.data || []);
    setTitles(titlesRes.data || new Map());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── campaigns ────────────────────────────────────────────────────────

  const saveCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.titulo.trim()) { setError('El título de la campaña es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      titulo: campaignForm.titulo.trim(),
      autor: nullIfBlank(campaignForm.autor),
      descripcion: nullIfBlank(campaignForm.descripcion),
      badge_url: campaignForm.badge_url,
      badge_path: campaignForm.badge_path,
    };
    const { error: saveError } = campaignForm.id
      ? await supabase.from('campaigns').update(payload).eq('id', campaignForm.id)
      : await supabase.from('campaigns').insert(payload);
    setSaving(false);
    if (saveError) { setError('No se pudo guardar la campaña. ' + saveError.message); return; }
    setMessage(campaignForm.id ? 'Campaña actualizada.' : 'Campaña creada.');
    setCampaignForm(null);
    load();
  };

  const deleteCampaign = async (campaign) => {
    const count = campaign.missions?.length || 0;
    const warning = count > 0
      ? `¿Eliminar "${campaign.titulo}"? Se borran también sus ${count} ${count === 1 ? 'misión' : 'misiones'} y las insignias otorgadas.`
      : `¿Eliminar "${campaign.titulo}"? Se borran también las insignias otorgadas.`;
    if (!window.confirm(warning)) return;
    const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', campaign.id);
    if (deleteError) { setError('No se pudo eliminar la campaña.'); return; }
    setMessage('Campaña eliminada.');
    load();
  };

  // ── ordering ─────────────────────────────────────────────────────────

  // Moves a campaign one position up (-1) or down (1). The row moves in the
  // UI first and the write follows, because an admin reordering a list clicks
  // several times in a row and a round trip between each click makes the
  // buttons feel unresponsive.
  //
  // `moving` guards against overlapping swaps: two fast clicks would compute
  // their positions from the same starting list and write conflicting orden
  // values, leaving the list in an order the admin never asked for.
  const moveCampaign = async (index, direction) => {
    if (moving) return;
    const pair = neighborSwap(campaigns, index, direction);
    if (!pair) return; // already at the top or bottom
    const target = index + direction;
    setMoving(true);
    setError(null);
    setCampaigns(reorderLocally(campaigns, index, direction));
    // The moved row takes its destination index as its position, the row it
    // displaced takes the vacated one.
    const { error: swapError } = await swapCampaignOrder(pair.a, pair.b, target, index);
    setMoving(false);
    if (swapError) {
      setError(swapError);
      // The optimistic move is not what the database has; resync, keeping the
      // message that explains why the row is about to snap back.
      load({ keepError: true });
    }
  };

  // ── visibility ───────────────────────────────────────────────────────

  // Shows or hides a campaign on the public site. Like the reorder buttons the
  // card updates first and the write follows, because the whole point of the
  // control is to see what the public list will look like.
  //
  // Hiding is not destructive but it is not trivial either - it pulls the
  // campaign, its missions and every granted badge off the public site at
  // once - so it confirms. Un-hiding does not: putting something back is not
  // a decision anyone regrets.
  const toggleVisibility = async (campaign) => {
    const next = !campaign.visible;
    if (!next) {
      const granted = titles.get(campaign.id)?.size || 0;
      const consequences = granted > 0
        ? ` También se ocultan las insignias de ${granted} ${granted === 1 ? 'jugador' : 'jugadores'}.`
        : '';
      if (!window.confirm(
        `¿Ocultar "${campaign.titulo}"? Deja de verse en la web pública, con sus misiones.${consequences} No se borra nada y podés volver a mostrarla cuando quieras.`,
      )) return;
    }
    setError(null);
    // Patch the single row instead of reloading: the admin hides several
    // campaigns in a row, and a full refetch per click would collapse the
    // expanded card they are working in.
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, visible: next } : c)));
    const { error: visibilityError } = await setCampaignVisibility(campaign.id, next);
    if (visibilityError) {
      setError(visibilityError);
      load({ keepError: true });
      return;
    }
    setMessage(next ? 'Campaña visible en la web.' : 'Campaña oculta.');
  };

  // ── missions ─────────────────────────────────────────────────────────

  const saveMission = async (e) => {
    e.preventDefault();
    if (!missionForm.titulo.trim()) { setError('El título de la misión es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      campaign_id: missionForm.campaign_id,
      titulo: missionForm.titulo.trim(),
      descripcion: nullIfBlank(missionForm.descripcion),
      mapa: nullIfBlank(missionForm.mapa),
      imagen_url: missionForm.imagen_url,
      imagen_path: missionForm.imagen_path,
    };
    const { error: saveError } = missionForm.id
      ? await supabase.from('missions').update(payload).eq('id', missionForm.id)
      : await supabase.from('missions').insert(payload);
    setSaving(false);
    if (saveError) { setError('No se pudo guardar la misión. ' + saveError.message); return; }
    setMessage(missionForm.id ? 'Misión actualizada.' : 'Misión creada.');
    setMissionForm(null);
    load();
  };

  const deleteMission = async (mission) => {
    if (!window.confirm(`¿Eliminar la misión "${mission.titulo}"?`)) return;
    const { error: deleteError } = await supabase.from('missions').delete().eq('id', mission.id);
    if (deleteError) { setError('No se pudo eliminar la misión.'); return; }
    setMessage('Misión eliminada.');
    load();
  };

  // ── badges ───────────────────────────────────────────────────────────

  const toggleTitle = async (campaignId, playerId, hasTitle) => {
    const { error: titleError } = hasTitle
      ? await revokeTitle(campaignId, playerId)
      : await grantTitle(campaignId, playerId);
    if (titleError) { setError(titleError); return; }
    // Update in place instead of refetching everything: this toggle is the
    // one action an admin repeats dozens of times in a row, and a full
    // reload per click would make the list flicker.
    setTitles((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(campaignId) || []);
      if (hasTitle) set.delete(playerId); else set.add(playerId);
      next.set(campaignId, set);
      return next;
    });
  };

  if (loading) return <p className="admin-status">Cargando campañas...</p>;

  return (
    <section className="admin-campaigns">
      <div className="admin-campaigns-header">
        <h2 className="titulo-seccion">Campañas</h2>
        <button type="button" className="btn-amarillo"
          onClick={() => { setCampaignForm({ ...EMPTY_CAMPAIGN }); setMissionForm(null); }}>
          Nueva campaña
        </button>
      </div>

      {message && <p className="admin-message form-info">{message}</p>}
      {error && <p role="alert" className="admin-message form-error">{error}</p>}

      {campaignForm && (
        <form className="admin-campaign-form" onSubmit={saveCampaign}>
          <h3 className="admin-form-heading">
            {campaignForm.id ? `Editando "${campaignForm.titulo}"` : 'Nueva campaña'}
          </h3>
          <div className="admin-campaign-fields">
            <label>Título
              <input type="text" value={campaignForm.titulo}
                onChange={(e) => setCampaignForm({ ...campaignForm, titulo: e.target.value })} />
            </label>
            <label>Autor
              <input type="text" value={campaignForm.autor || ''}
                onChange={(e) => setCampaignForm({ ...campaignForm, autor: e.target.value })} />
            </label>
          </div>
          {/* 10 rows, not 3: a campaign description is a multi-paragraph
              briefing, and editing one through a 3-line window means the
              admin cannot see the paragraph they are writing. */}
          <label className="admin-campaign-textarea">Descripción
            <textarea rows={10} value={campaignForm.descripcion || ''}
              onChange={(e) => setCampaignForm({ ...campaignForm, descripcion: e.target.value })} />
          </label>
          <div className="admin-campaign-badge-field">
            <span className="admin-field-label">Insignia</span>
            <CampaignImageUpload
              folder="campaign"
              currentUrl={campaignForm.badge_url}
              label="Subir insignia"
              onUploaded={({ url, path }) => setCampaignForm({ ...campaignForm, badge_url: url, badge_path: path })}
            />
          </div>
          <div className="admin-campaign-actions">
            <button type="submit" className="btn-amarillo" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn-blanco" onClick={() => setCampaignForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <p className="admin-status">Todavía no hay campañas.</p>
      ) : (
        <div className="admin-campaign-list">
          {campaigns.map((campaign, index) => {
            const granted = titles.get(campaign.id) || new Set();
            const isExpanded = expandedId === campaign.id;
            return (
              <article key={campaign.id}
                className={`admin-campaign-card${campaign.visible === false ? ' admin-campaign-card-hidden' : ''}`}>
                <header className="admin-campaign-card-header">
                  {/* Reordering lives in the card header, next to the badge,
                      so the control sits where the row it moves is. Disabled
                      at the ends of the list rather than hidden: a button that
                      disappears shifts the two beside it under the cursor. */}
                  <div className="admin-campaign-order">
                    <button type="button" className="admin-order-btn"
                      aria-label={`Subir ${campaign.titulo}`}
                      disabled={index === 0 || moving}
                      onClick={() => moveCampaign(index, -1)}>↑</button>
                    <button type="button" className="admin-order-btn"
                      aria-label={`Bajar ${campaign.titulo}`}
                      disabled={index === campaigns.length - 1 || moving}
                      onClick={() => moveCampaign(index, 1)}>↓</button>
                  </div>
                  {campaign.badge_url && <img src={campaign.badge_url} alt="" className="admin-campaign-badge" />}
                  <div className="admin-campaign-card-info">
                    <h3 className="admin-campaign-titulo">
                      {campaign.titulo}
                      {/* The badge is a word, not just the dimmed card: an
                          admin scanning the list needs to know why a card
                          looks different without hovering anything. */}
                      {campaign.visible === false && (
                        <span className="admin-campaign-hidden-tag">Oculta</span>
                      )}
                    </h3>
                    <p className="admin-campaign-meta">
                      {campaign.missions?.length || 0} {(campaign.missions?.length || 0) === 1 ? 'misión' : 'misiones'}
                      {' · '}{granted.size} con insignia
                    </p>
                  </div>
                  <div className="admin-campaign-card-actions">
                    {/* The label is the action, not the state ("Ocultar" hides
                        it), matching Editar/Eliminar beside it. The state is
                        carried by the tag and the dimming instead, so the
                        button never has to be read as a status. */}
                    <button type="button" className="admin-action"
                      onClick={() => toggleVisibility(campaign)}>
                      {campaign.visible === false ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button type="button" className="admin-action admin-action-edit"
                      onClick={() => { setCampaignForm({ ...campaign }); setMissionForm(null); }}>Editar</button>
                    <button type="button" className="admin-action admin-action-danger"
                      onClick={() => deleteCampaign(campaign)}>Eliminar</button>
                    {/* "Cerrar", not "Ocultar": this collapses the card, and
                        the button beside it now hides the campaign from the
                        public site. Two buttons reading "Ocultar" on the same
                        card, one cosmetic and one with public consequences,
                        is a misclick waiting to happen. */}
                    <button type="button" className="admin-action"
                      onClick={() => setExpandedId(isExpanded ? null : campaign.id)}>
                      {isExpanded ? 'Cerrar' : 'Gestionar'}
                    </button>
                  </div>
                </header>

                {isExpanded && (
                  <div className="admin-campaign-body">
                    <div className="admin-campaign-subheader">
                      <h4 className="admin-subheading">Misiones</h4>
                      <button type="button" className="btn-blanco admin-small-btn"
                        onClick={() => { setMissionForm({ ...EMPTY_MISSION, campaign_id: campaign.id }); setCampaignForm(null); }}>
                        Nueva misión
                      </button>
                    </div>

                    {missionForm?.campaign_id === campaign.id && (
                      <form className="admin-mission-form" onSubmit={saveMission}>
                        <div className="admin-campaign-fields">
                          <label>Título
                            <input type="text" value={missionForm.titulo}
                              onChange={(e) => setMissionForm({ ...missionForm, titulo: e.target.value })} />
                          </label>
                          <label>Mapa
                            <input type="text" value={missionForm.mapa || ''}
                              onChange={(e) => setMissionForm({ ...missionForm, mapa: e.target.value })} />
                          </label>
                        </div>
                        <label className="admin-campaign-textarea">Descripción
                          <textarea rows={6} value={missionForm.descripcion || ''}
                            onChange={(e) => setMissionForm({ ...missionForm, descripcion: e.target.value })} />
                        </label>
                        <div className="admin-campaign-badge-field">
                          <span className="admin-field-label">Portada</span>
                          <CampaignImageUpload
                            folder="mission"
                            currentUrl={missionForm.imagen_url}
                            label="Subir portada"
                            onUploaded={({ url, path }) => setMissionForm({ ...missionForm, imagen_url: url, imagen_path: path })}
                          />
                        </div>
                        <div className="admin-campaign-actions">
                          <button type="submit" className="btn-amarillo" disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar misión'}
                          </button>
                          <button type="button" className="btn-blanco" onClick={() => setMissionForm(null)}>Cancelar</button>
                        </div>
                      </form>
                    )}

                    {(campaign.missions?.length || 0) === 0 ? (
                      <p className="admin-empty-note">Esta campaña no tiene misiones.</p>
                    ) : (
                      <ul className="admin-mission-list">
                        {campaign.missions.map((mission) => (
                          <li key={mission.id} className="admin-mission-row">
                            <div className="admin-mission-info">
                              <span className="admin-mission-titulo">{mission.titulo}</span>
                              {mission.mapa && <span className="admin-mission-meta">{mission.mapa}</span>}
                            </div>
                            <div className="admin-actions">
                              <button type="button" className="admin-action admin-action-edit"
                                onClick={() => { setMissionForm({ ...mission, campaign_id: campaign.id }); setCampaignForm(null); }}>
                                Editar
                              </button>
                              <button type="button" className="admin-action admin-action-danger"
                                onClick={() => deleteMission(mission)}>Eliminar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <h4 className="admin-subheading">Insignia de campaña</h4>
                    <p className="admin-help-note">
                      Marcá a quienes participaron de toda la campaña para otorgarles la insignia.
                    </p>
                    <div className="admin-title-grid">
                      {players.filter((p) => p.is_active).map((player) => {
                        const hasTitle = granted.has(player.id);
                        return (
                          <label key={player.id} className="admin-title-option">
                            <input
                              type="checkbox"
                              checked={hasTitle}
                              onChange={() => toggleTitle(campaign.id, player.id, hasTitle)}
                            />
                            <PlayerAvatar url={player.avatar_url} size={24} alt="" />
                            <span>{player.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AdminCampaigns;
