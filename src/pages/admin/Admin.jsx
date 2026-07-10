import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import './admin.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import AdminLoginForm from './AdminLoginForm';
import PlayerForm from '@components/component-playerform/playerform';

const EDIT_FIELDS = ['nombre', 'rol_favorito', 'miembro_desde', 'apt_tirador', 'apt_medico', 'apt_mortero'];

const Admin = () => {
  const { session, loading: authLoading } = useAuth();
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!session) { setAdminCheckLoading(false); setIsAdmin(false); return; }
    let isMounted = true;
    setAdminCheckLoading(true);
    supabase.from('players').select('is_admin').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (!isMounted) return;
        setIsAdmin(!error && Boolean(data?.is_admin));
        setAdminCheckLoading(false);
      });
    return () => { isMounted = false; };
  }, [session]);

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
      apt_tirador: values.apt_tirador,
      apt_medico: values.apt_medico,
      apt_mortero: values.apt_mortero,
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

  if (authLoading) return (<>{helmet}<p className="admin-status">Cargando...</p></>);
  if (!session) return (<>{helmet}<div className="admin-login-container"><AdminLoginForm /></div></>);
  if (adminCheckLoading) return (<>{helmet}<p className="admin-status">Verificando permisos...</p></>);
  if (!isAdmin) return (<>{helmet}<p className="admin-status">No tenés permisos de administrador.</p></>);

  return (
    <>
      {helmet}
      <div className="admin-container">
        <div className="admin-header">
          <h1>Panel de administración</h1>
          <button className="btn-blanco" onClick={handleSignOut}>Cerrar sesión</button>
        </div>
        {actionMessage && <p className="form-info">{actionMessage}</p>}
        {playersError && <p role="alert" className="form-error">{playersError}</p>}
        {editingPlayer && (
          <PlayerForm
            initialValues={editingPlayer}
            fields={EDIT_FIELDS}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            submitting={formSubmitting}
            error={formError}
          />
        )}
        {playersLoading ? (
          <p>Cargando jugadores...</p>
        ) : players.length === 0 ? (
          <p>Todavía no hay jugadores registrados.</p>
        ) : (
          <table className="admin-players-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Rol favorito</th><th>Miembro desde</th>
                <th>Tirador</th><th>Médico</th><th>Mortero</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'admin-row-inactive'}>
                  <td>{p.nombre}</td>
                  <td>{p.rol_favorito}</td>
                  <td>{p.miembro_desde}</td>
                  <td>{p.apt_tirador ? 'Sí' : 'No'}</td>
                  <td>{p.apt_medico ? 'Sí' : 'No'}</td>
                  <td>{p.apt_mortero ? 'Sí' : 'No'}</td>
                  <td>{p.is_active ? 'Activo' : <span className="admin-inactive-tag">Inactivo</span>}</td>
                  <td>
                    <button className="btn-blanco" onClick={() => openEditForm(p)}>Editar</button>
                    <button className="btn-transparente" disabled={togglingId === p.id}
                      onClick={() => handleToggleActive(p)}>
                      {p.is_active ? 'Eliminar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default Admin;
