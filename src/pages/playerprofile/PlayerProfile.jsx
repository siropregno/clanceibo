import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './playerprofile.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import PlayerForm from '@components/component-playerform/playerform';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';
import AvatarUploader from '@components/component-avatarupload/avatarupload';
import ScreenshotGallery from '@components/component-screenshotgallery/screenshotgallery';
import ScreenshotUpload from '@components/component-screenshotupload/screenshotupload';
import { GiCrosshair, GiMedicalPack, GiMortar } from 'react-icons/gi';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const formatMiembroDesde = (dateStr) => {
  if (!dateStr) return 'Fecha de ingreso no disponible';
  const [year, month] = dateStr.split('-');
  return `Miembro desde ${MESES[parseInt(month, 10) - 1]} ${year}`;
};

const BADGES = [
  { key: 'apt_tirador', label: 'Tirador especial', Icon: GiCrosshair },
  { key: 'apt_medico', label: 'Medicina de combate', Icon: GiMedicalPack },
  { key: 'apt_mortero', label: 'Morterista', Icon: GiMortar },
];

const PlayerProfile = () => {
  const { id } = useParams();
  const { session, refreshProfile } = useAuth();
  const isOwnProfile = session?.user?.id === id;

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [screenshots, setScreenshots] = useState([]);
  const [screenshotsLoading, setScreenshotsLoading] = useState(true);
  const [screenshotError, setScreenshotError] = useState(null);

  const fetchPlayer = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from('players').select('*').eq('id', id).single();
    if (fetchError) setError('No se pudo cargar este perfil.');
    else setPlayer(data);
    setLoading(false);
  }, [id]);

  const fetchScreenshots = useCallback(async () => {
    setScreenshotsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('player_screenshots')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: false });
    if (fetchError) setScreenshotError('No se pudieron cargar los screenshots.');
    else setScreenshots(data || []);
    setScreenshotsLoading(false);
  }, [id]);

  useEffect(() => { fetchPlayer(); }, [fetchPlayer]);
  useEffect(() => { fetchScreenshots(); }, [fetchScreenshots]);

  const handleProfileSaved = async (values) => {
    setFormSubmitting(true);
    setFormError(null);
    const { error: updateError } = await supabase
      .from('players')
      .update({ nombre: values.nombre.trim(), rol_favorito: values.rol_favorito.trim() || null })
      .eq('id', values.id);
    setFormSubmitting(false);
    if (updateError) { setFormError('No se pudo guardar. ' + updateError.message); return; }
    setEditing(false);
    fetchPlayer();
    refreshProfile();
  };

  const handleAvatarUploaded = () => {
    fetchPlayer();
    refreshProfile();
  };

  const handleScreenshotUploaded = (row) => {
    setScreenshots((prev) => [row, ...prev]);
  };

  const handleScreenshotDelete = async (shot) => {
    if (!window.confirm('¿Eliminar este screenshot?')) return;
    await supabase.storage.from('screenshots').remove([shot.storage_path]);
    const { error: deleteError } = await supabase.from('player_screenshots').delete().eq('id', shot.id);
    if (deleteError) { setScreenshotError('No se pudo eliminar el screenshot.'); return; }
    setScreenshots((prev) => prev.filter((s) => s.id !== shot.id));
  };

  if (loading) {
    return (
      <div className="playerprofile-page playerprofile-page-status page-container">
        <p className="playerprofile-status">Cargando perfil...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="playerprofile-page playerprofile-page-status page-container">
        <p className="playerprofile-status form-error">{error || 'Perfil no encontrado.'}</p>
        <Link to="/roster"><button className="btn-amarillo">← Volver al Roster</button></Link>
      </div>
    );
  }

  const earnedBadges = BADGES.filter(({ key }) => player[key]);

  return (
    <>
      <Helmet><title>CLAN CEIBO | {player.nombre}</title></Helmet>
      <div className="playerprofile-page page-container">
        <div className="playerprofile-content">
          <Link className="playerprofile-back" to="/roster">← Volver al Roster</Link>

          <div className="playerprofile-card">
            <div className="playerprofile-header">
              <PlayerAvatar url={player.avatar_url} size={72} alt={`Foto de perfil de ${player.nombre}`} />
              <div className="playerprofile-headerinfo">
                <h1 className="playerprofile-name">{player.nombre}</h1>
                <p className="playerprofile-role">{player.rol_favorito || 'Sin rol favorito'}</p>
                <p className="playerprofile-since">{formatMiembroDesde(player.miembro_desde)}</p>
              </div>
              {isOwnProfile && !editing && (
                <button className="btn-blanco playerprofile-edit-btn" onClick={() => setEditing(true)}>
                  Editar mi perfil
                </button>
              )}
            </div>

            {isOwnProfile && editing && (
              <div className="playerprofile-editpanel">
                <AvatarUploader userId={player.id} currentUrl={player.avatar_url} onUploaded={handleAvatarUploaded} />
                <PlayerForm
                  initialValues={player}
                  fields={['nombre', 'rol_favorito']}
                  onSubmit={handleProfileSaved}
                  onCancel={() => setEditing(false)}
                  submitting={formSubmitting}
                  error={formError}
                />
              </div>
            )}

            <h3>Aptitudes</h3>
            {earnedBadges.length === 0 ? (
              <p className="playerprofile-badges-empty">No hay aptitudes aún.</p>
            ) : (
              <div className="playerprofile-badges">
                {earnedBadges.map(({ key, label, Icon }) => (
                  <div key={key} className="playerprofile-badge">
                    <span className="badge-chip earned"><Icon /></span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="playerprofile-screenshots">
            <div className="playerprofile-screenshots-header">
              <h3>Screenshots</h3>
              {isOwnProfile && <ScreenshotUpload userId={player.id} onUploaded={handleScreenshotUploaded} />}
            </div>
            {screenshotError && <p role="alert" className="form-error">{screenshotError}</p>}
            {screenshotsLoading ? (
              <p className="playerprofile-status">Cargando screenshots...</p>
            ) : (
              <ScreenshotGallery
                screenshots={screenshots}
                canManage={isOwnProfile}
                onDelete={handleScreenshotDelete}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerProfile;
