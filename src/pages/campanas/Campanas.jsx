import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './campanas.css';
import { fetchCampaignsWithMissions } from '@lib/campaigns';
import { formatFecha, formatRango } from '@lib/fechas';

const Campanas = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchCampaignsWithMissions();
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

const CampaignCard = ({ campaign }) => {
  const { titulo, descripcion, badge_url, fecha_inicio, fecha_fin, missions = [] } = campaign;
  const rango = formatRango(fecha_inicio, fecha_fin);
  return (
    <article className="campana-card">
      <header className="campana-card-header">
        {badge_url && <img src={badge_url} alt="" className="campana-badge" />}
        <div className="campana-card-headerinfo">
          <h2 className="titulo-seccion campana-titulo">{titulo}</h2>
          {rango && <p className="campana-fechas">{rango}</p>}
          <p className="campana-count">
            {missions.length} {missions.length === 1 ? 'misión' : 'misiones'}
          </p>
        </div>
      </header>
      {descripcion && <p className="campana-descripcion">{descripcion}</p>}
      {missions.length > 0 && (
        <ol className="campana-misiones">
          {missions.map((mission) => (
            <MissionItem key={mission.id} mission={mission} />
          ))}
        </ol>
      )}
    </article>
  );
};

const MissionItem = ({ mission }) => {
  const { titulo, descripcion, fecha, mapa, imagen_url } = mission;
  return (
    <li className="campana-mision">
      {imagen_url && <img src={imagen_url} alt="" className="campana-mision-img" />}
      <div className="campana-mision-info">
        <h3 className="campana-mision-titulo">{titulo}</h3>
        <p className="campana-mision-meta">
          {formatFecha(fecha)}{mapa ? ` · ${mapa}` : ''}
        </p>
        {descripcion && <p className="campana-mision-desc">{descripcion}</p>}
      </div>
    </li>
  );
};

export default Campanas;
