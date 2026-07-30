import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './admin.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import AdminLoginForm from './AdminLoginForm';
import PlayerForm from '@components/component-playerform/playerform';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';
import { APTITUDES } from '@lib/aptitudes';

const EDIT_FIELDS = ['nombre', 'rol_favorito', 'miembro_desde', ...APTITUDES.map(({ key }) => key)];

const Admin = () => {
  const { session, loading: authLoading, profile, profileLoading } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchPlayers = async () => {
    setPlayersLoading(true);
    setPlayersError(null);
    const { data, error } = await supabase.from('players').select('*').order('nombre', { ascending: true });
    if (error) setPlayersError('No se pudieron cargar los jugadores.');
    else setPlayers(data || []);
    setPlayersLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchPlayers(); }, [isAdmin]);

  const handleSignOut = async () => { await supabase.auth.signOut(); };
  const openEditForm = (player) => { setEditingPlayer(player); setFormError(null); };
  const closeForm = () => { setEditingPlayer(null); setFormError(null); };

  const handleFormSubmit = async (values) => {
    setFormSubmitting(true);
    setFormError(null);
    const payload = {
      nombre: values.nombre.trim(),
      rol_favorito: values.rol_favorito.trim() || null,
      miembro_desde: values.miembro_desde || null,
      ...Object.fromEntries(APTITUDES.map(({ key }) => [key, values[key]])),
    };
    const { error } = await supabase.from('players').update(payload).eq('id', values.id);
    setFormSubmitting(false);
    if (error) { setFormError('No se pudo guardar. ' + error.message); return; }
    setActionMessage('Jugador actualizado.');
    closeForm();
    fetchPlayers();
  };

  const handleToggleActive = async (player) => {
    const nextActive = !player.is_active;
    setTogglingId(player.id);
    const { error } = await supabase.from('players').update({ is_active: nextActive }).eq('id', player.id);
    setTogglingId(null);
    if (error) { setPlayersError('No se pudo actualizar el estado del jugador.'); return; }
    setActionMessage(nextActive ? 'Jugador reactivado.' : 'Jugador desactivado.');
    fetchPlayers();
  };

  const helmet = (
    <Helmet>
      <title>CLAN CEIBO | Panel</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );

  const statusScreen = (text) => (
    <>{helmet}<div className="admin-page"><p className="admin-status">{text}</p></div></>
  );

  if (authLoading) return statusScreen('Cargando...');
  if (!session) return (<>{helmet}<div className="admin-login-container"><AdminLoginForm /></div></>);
  if (profileLoading) return statusScreen('Verificando permisos...');
  if (!isAdmin) return statusScreen('No tenés permisos de administrador.');

  const activeCount = players.filter((p) => p.is_active).length;

  return (
    <>
      {helmet}
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-header">
            <div>
              <h1 className="admin-title">Panel de administración</h1>
              {!playersLoading && players.length > 0 && (
                <p className="admin-subtitle">
                  {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} · {activeCount} activo{activeCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <button className="btn-blanco" onClick={handleSignOut}>Cerrar sesión</button>
          </div>

          {actionMessage && <p className="admin-message form-info">{actionMessage}</p>}
          {playersError && <p role="alert" className="admin-message form-error">{playersError}</p>}

          {editingPlayer && (
            <div className="admin-form-panel">
              <h2 className="admin-form-title">Editando a {editingPlayer.nombre}</h2>
              <PlayerForm
                initialValues={editingPlayer}
                fields={EDIT_FIELDS}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
                submitting={formSubmitting}
                error={formError}
              />
            </div>
          )}

          {playersLoading ? (
            <p className="admin-status">Cargando jugadores...</p>
          ) : players.length === 0 ? (
            <p className="admin-status">Todavía no hay jugadores registrados.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-players-table">
                <thead>
                  <tr>
                    <th className="admin-col-avatar"><span className="admin-visually-hidden">Foto</span></th>
                    <th>Nombre</th>
                    <th>Rol favorito</th>
                    <th>Miembro desde</th>
                    <th className="admin-col-aptitudes">Aptitudes</th>
                    <th>Estado</th>
                    <th className="admin-col-actions"><span className="admin-visually-hidden">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} className={p.is_active ? '' : 'admin-row-inactive'}>
                      <td className="admin-col-avatar" data-label="Foto">
                        <PlayerAvatar url={p.avatar_url} size={36} alt={`Foto de perfil de ${p.nombre}`} />
                      </td>
                      <td className="admin-cell-name" data-label="Nombre">{p.nombre}</td>
                      <td data-label="Rol favorito">{p.rol_favorito || <span className="admin-empty">—</span>}</td>
                      <td data-label="Miembro desde">{p.miembro_desde || <span className="admin-empty">—</span>}</td>
                      <td className="admin-col-aptitudes" data-label="Aptitudes">
                        <div className="admin-badges">
                          {APTITUDES.filter(({ key }) => p[key]).map(({ key, label, image }) => (
                            <img key={key} className="admin-badge" src={image} alt={label} title={label} />
                          ))}
                          {APTITUDES.every(({ key }) => !p[key]) && <span className="admin-empty">—</span>}
                        </div>
                      </td>
                      <td data-label="Estado">
                        <span className={`admin-tag ${p.is_active ? 'admin-tag-active' : 'admin-tag-inactive'}`}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="admin-col-actions">
                        <div className="admin-actions">
                          <Link to={`/roster/${p.id}`} className="admin-action-link">Ver perfil</Link>
                          <button type="button" className="admin-action admin-action-edit"
                            onClick={() => openEditForm(p)}>Editar</button>
                          <button type="button"
                            className={`admin-action ${p.is_active ? 'admin-action-danger' : 'admin-action-restore'}`}
                            disabled={togglingId === p.id}
                            onClick={() => handleToggleActive(p)}>
                            {togglingId === p.id ? '...' : p.is_active ? 'Eliminar' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Admin;
