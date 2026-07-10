import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './miperfil.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import PlayerForm from '@components/component-playerform/playerform';
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
  const { session, loading: authLoading } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchMyProfile = async (userId) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('players').select('*').eq('id', userId).single();
    if (fetchError) setError('No se pudo cargar tu perfil.');
    else setPlayer(data);
    setLoading(false);
  };

  useEffect(() => { if (session) fetchMyProfile(session.user.id); }, [session]);

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
    fetchMyProfile(values.id);
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
          {loading && <p className="miperfil-status">Cargando tu perfil...</p>}
          {error && <p className="form-error">{error}</p>}
          {successMessage && <p className="form-info">{successMessage}</p>}
          {player && !editing && (
            <div className="miperfil-card">
              <h2>{player.nombre}</h2>
              <p className="miperfil-role">{player.rol_favorito || 'Sin rol favorito'}</p>
              <p className="miperfil-since">{formatMiembroDesde(player.miembro_desde)}</p>
              <h3>Aptitudes (otorgadas por administradores)</h3>
              <div className="miperfil-badges">
                {BADGES.map(({ key, label, Icon }) => (
                  <div key={key} className={`miperfil-badge${player[key] ? ' earned' : ''}`}>
                    <span className={`badge-chip${player[key] ? ' earned' : ''}`}><Icon /></span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <button className="btn-amarillo" onClick={() => setEditing(true)}>Editar mi perfil</button>
            </div>
          )}
          {player && editing && (
            <PlayerForm
              initialValues={player}
              fields={['nombre', 'rol_favorito']}
              onSubmit={handleSubmit}
              onCancel={() => setEditing(false)}
              submitting={submitting}
              error={formError}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MiPerfil;
