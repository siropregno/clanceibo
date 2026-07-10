import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './miperfil.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import PlayerForm from '@components/component-playerform/playerform';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';
import AvatarUploader from '@components/component-avatarupload/avatarupload';
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

const MiPerfil = () => {
  const { session, loading: authLoading, profile, profileLoading, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setFormError(null);
    const { error: updateError } = await supabase
      .from('players')
      .update({ nombre: values.nombre.trim(), rol_favorito: values.rol_favorito.trim() || null })
      .eq('id', values.id);
    setSubmitting(false);
    if (updateError) { setFormError('No se pudo guardar. ' + updateError.message); return; }
    setSuccessMessage('Perfil actualizado.');
    setEditing(false);
    refreshProfile();
  };

  if (authLoading) return <div className="miperfil-page"><p className="miperfil-status">Cargando...</p></div>;

  if (!session) {
    return (
      <>
        <Helmet><title>CLAN CEIBO | Mi perfil</title></Helmet>
        <div className="miperfil-page">
          <div className="miperfil-container">
            <p>Necesitás iniciar sesión para ver tu perfil.</p>
            <Link to="/ingresar"><button className="btn-amarillo">Iniciar sesión</button></Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>CLAN CEIBO | Mi perfil</title></Helmet>
      <div className="miperfil-page">
        <div className="miperfil-container">
          <h1>Mi perfil</h1>
          {profileLoading && <p className="miperfil-status">Cargando tu perfil...</p>}
          {successMessage && <p className="form-info">{successMessage}</p>}
          {profile && !editing && (
            <div className="miperfil-card">
              <PlayerAvatar url={profile.avatar_url} size={90} alt={`Foto de perfil de ${profile.nombre}`} />
              <h2>{profile.nombre}</h2>
              <p className="miperfil-role">{profile.rol_favorito || 'Sin rol favorito'}</p>
              <p className="miperfil-since">{formatMiembroDesde(profile.miembro_desde)}</p>
              <h3>Aptitudes (otorgadas por administradores)</h3>
              <div className="miperfil-badges">
                {BADGES.map(({ key, label, Icon }) => (
                  <div key={key} className={`miperfil-badge${profile[key] ? ' earned' : ''}`}>
                    <span className={`badge-chip${profile[key] ? ' earned' : ''}`}><Icon /></span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <button className="btn-amarillo" onClick={() => setEditing(true)}>Editar mi perfil</button>
            </div>
          )}
          {profile && editing && (
            <div className="miperfil-card">
              <AvatarUploader userId={profile.id} currentUrl={profile.avatar_url} onUploaded={refreshProfile} />
              <PlayerForm
                initialValues={profile}
                fields={['nombre', 'rol_favorito']}
                onSubmit={handleSubmit}
                onCancel={() => setEditing(false)}
                submitting={submitting}
                error={formError}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MiPerfil;
