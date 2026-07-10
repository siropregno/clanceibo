import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import './roster.css';
import { supabase } from '@lib/supabaseClient';
import PlayerCard from '@components/component-playercard/playercard';
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

const Roster = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .order('nombre', { ascending: true });
      if (!isMounted) return;
      if (fetchError) setError('No se pudo cargar el roster. Intentá de nuevo más tarde.');
      else setPlayers(data || []);
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, []);

  const handleBackClick = () => setSelectedPlayer(null);

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Roster</title>
      </Helmet>
      <div className="roster-container">
        <div className="roster-header">
          <h1>Roster</h1>
          <p className="roster-subtitle">Los miembros de nuestra comunidad.</p>
        </div>
        <div className="roster-content">
          {loading ? (
            <p className="roster-status">Cargando roster...</p>
          ) : error ? (
            <p className="roster-status roster-error">{error}</p>
          ) : players.length === 0 ? (
            <p className="roster-status">Todavía no hay miembros cargados.</p>
          ) : selectedPlayer ? (
            <div className="player-detail-container">
              <div className="player-detail-card">
                <h2 className="player-detail-name">{selectedPlayer.nombre}</h2>
                <p className="player-detail-role">{selectedPlayer.rol_favorito || 'Sin rol favorito'}</p>
                <p className="player-detail-since">{formatMiembroDesde(selectedPlayer.miembro_desde)}</p>
                <h3>Aptitudes</h3>
                <div className="player-detail-badges">
                  {BADGES.map(({ key, label, Icon }) => (
                    <div key={key} className="player-detail-badge">
                      <span className={`badge-chip${selectedPlayer[key] ? ' earned' : ''}`}><Icon /></span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-amarillo" onClick={handleBackClick}>
                ← Volver al Roster
              </button>
            </div>
          ) : (
            <div className="roster-grid">
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} onSelect={setSelectedPlayer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Roster;
