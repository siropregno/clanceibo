import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './campanas.css';
import { fetchCampaigns } from '@lib/campaigns';

const Campanas = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchCampaigns();
      if (!isMounted) return;
      setError(fetchError);
      setCampaigns(data || []);
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Campañas</title>
      </Helmet>
      <div className="campanas-container page-container">
        <div className="campanas-header">
          <h1 className="titulo-pagina">Campañas</h1>
          <p className="subtitulo-pagina campanas-subtitle">
            Las operaciones que peleamos, misión por misión.
          </p>
        </div>
        <div className="campanas-content">
          {loading ? (
            <p className="campanas-status">Cargando campañas...</p>
          ) : error ? (
            <p role="alert" className="campanas-status campanas-error">{error}</p>
          ) : campaigns.length === 0 ? (
            <p className="campanas-status">Todavía no hay campañas cargadas.</p>
          ) : (
            <div className="campanas-list">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Badge on the left, title and description on the right. The whole card is
// the link (like PlayerRow), so the click target is the card rather than a
// small "ver más" affordance inside it.
const CampaignCard = ({ campaign }) => {
  const { id, titulo, autor, descripcion, badge_url, mission_count = 0 } = campaign;
  return (
    <Link className="campana-card" to={`/campanas/${id}`}>
      <div className="campana-card-badge">
        {badge_url ? (
          <img src={badge_url} alt="" className="campana-badge" />
        ) : (
          // Campaigns can exist before their artwork does. The initial keeps
          // the card's left column from collapsing to nothing.
          <span className="campana-badge-fallback" aria-hidden="true">
            {titulo.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="campana-card-info">
        <h2 className="campana-titulo">{titulo}</h2>
        {autor && <p className="campana-autor">por {autor}</p>}
        {descripcion && <p className="campana-descripcion">{descripcion}</p>}
        <p className="campana-count">
          {mission_count} {mission_count === 1 ? 'misión' : 'misiones'}
        </p>
      </div>
      <span className="campana-card-arrow">→</span>
    </Link>
  );
};

export default Campanas;
