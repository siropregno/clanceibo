import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import './campanadetalle.css';
import { fetchCampaignWithMissions } from '@lib/campaigns';
import { formatFecha, formatRango } from '@lib/fechas';

const CampanaDetalle = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchCampaignWithMissions(id);
      if (!isMounted) return;
      setError(fetchError);
      setCampaign(data);
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="campanadetalle-page campanadetalle-page-status page-container">
        <p className="campanadetalle-status">Cargando campaña...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="campanadetalle-page campanadetalle-page-status page-container">
        <p role="alert" className="campanadetalle-status form-error">
          {error || 'Campaña no encontrada.'}
        </p>
        <Link to="/campanas"><button className="btn-amarillo">← Volver a Campañas</button></Link>
      </div>
    );
  }

  const { titulo, descripcion, badge_url, fecha_inicio, fecha_fin, missions = [] } = campaign;
  const rango = formatRango(fecha_inicio, fecha_fin);

  return (
    <>
      <Helmet><title>CLAN CEIBO | {titulo}</title></Helmet>
      <div className="campanadetalle-page page-container">
        <div className="campanadetalle-content">
          <Link className="campanadetalle-back" to="/campanas">← Volver a Campañas</Link>

          <div className="campanadetalle-card">
            <div className="campanadetalle-header">
              {badge_url ? (
                <img src={badge_url} alt="" className="campanadetalle-badge" />
              ) : (
                <span className="campanadetalle-badge-fallback" aria-hidden="true">
                  {titulo.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="campanadetalle-headerinfo">
                <h1 className="campanadetalle-titulo">{titulo}</h1>
                {rango && <p className="campanadetalle-fechas">{rango}</p>}
                <p className="campanadetalle-count">
                  {missions.length} {missions.length === 1 ? 'misión' : 'misiones'}
                </p>
              </div>
            </div>
            {descripcion && <p className="campanadetalle-descripcion">{descripcion}</p>}
          </div>

          <div className="campanadetalle-misiones-panel">
            <h2 className="campanadetalle-subtitulo">Misiones</h2>
            {missions.length === 0 ? (
              <p className="campanadetalle-empty">Esta campaña todavía no tiene misiones cargadas.</p>
            ) : (
              <ol className="campanadetalle-misiones">
                {missions.map((mission) => (
                  <MissionItem key={mission.id} mission={mission} />
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const MissionItem = ({ mission }) => {
  const { titulo, descripcion, fecha, mapa, imagen_url } = mission;
  return (
    <li className="campanadetalle-mision">
      {imagen_url && <img src={imagen_url} alt="" className="campanadetalle-mision-img" />}
      <div className="campanadetalle-mision-info">
        <h3 className="campanadetalle-mision-titulo">{titulo}</h3>
        <p className="campanadetalle-mision-meta">
          {formatFecha(fecha)}{mapa ? ` · ${mapa}` : ''}
        </p>
        {descripcion && <p className="campanadetalle-mision-desc">{descripcion}</p>}
      </div>
    </li>
  );
};

export default CampanaDetalle;
