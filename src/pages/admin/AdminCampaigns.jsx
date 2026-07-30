import React, { useCallback, useEffect, useState } from 'react';
import './admincampaigns.css';
import { supabase } from '@lib/supabaseClient';
import { fetchCampaignsWithMissions, fetchTitlesByCampaign, grantTitle, revokeTitle } from '@lib/campaigns';
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

  const [campaignForm, setCampaignForm] = useState(null); // null | EMPTY | existing row
  const [missionForm, setMissionForm] = useState(null);   // null | { campaign_id, ...mission }
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [campaignsRes, titlesRes] = await Promise.all([
      fetchCampaignsWithMissions(),
      fetchTitlesByCampaign(),
    ]);
    setError(campaignsRes.error || titlesRes.error);
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
          <label className="admin-campaign-textarea">Descripción
            <textarea rows={3} value={campaignForm.descripcion || ''}
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
          {campaigns.map((campaign) => {
            const granted = titles.get(campaign.id) || new Set();
            const isExpanded = expandedId === campaign.id;
            return (
              <article key={campaign.id} className="admin-campaign-card">
                <header className="admin-campaign-card-header">
                  {campaign.badge_url && <img src={campaign.badge_url} alt="" className="admin-campaign-badge" />}
                  <div className="admin-campaign-card-info">
                    <h3 className="admin-campaign-titulo">{campaign.titulo}</h3>
                    <p className="admin-campaign-meta">
                      {campaign.missions?.length || 0} {(campaign.missions?.length || 0) === 1 ? 'misión' : 'misiones'}
                      {' · '}{granted.size} con insignia
                    </p>
                  </div>
                  <div className="admin-campaign-card-actions">
                    <button type="button" className="admin-action admin-action-edit"
                      onClick={() => { setCampaignForm({ ...campaign }); setMissionForm(null); }}>Editar</button>
                    <button type="button" className="admin-action admin-action-danger"
                      onClick={() => deleteCampaign(campaign)}>Eliminar</button>
                    <button type="button" className="admin-action"
                      onClick={() => setExpandedId(isExpanded ? null : campaign.id)}>
                      {isExpanded ? 'Ocultar' : 'Gestionar'}
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
                          <textarea rows={2} value={missionForm.descripcion || ''}
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
