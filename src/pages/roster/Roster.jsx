import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './roster.css';
import { supabase } from '@lib/supabaseClient';
import PlayerRow from '@components/component-playerrow/playerrow';

const Roster = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Roster</title>
      </Helmet>
      <div className="roster-container page-container">
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
          ) : (
            <div className="roster-list">
              {players.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Roster;
