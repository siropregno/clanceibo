import React from 'react';
import { Link } from 'react-router-dom';
import './playerrow.css';
import { APTITUDES } from '@lib/aptitudes';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';
import Tooltip from '@components/component-tooltip/tooltip';

const PlayerRow = ({ player }) => {
  const { id, nombre, rol_favorito, avatar_url } = player;
  const earnedBadges = APTITUDES.filter(({ key }) => player[key]);
  return (
    <Link className="player-row" to={`/roster/${id}`}>
      <PlayerAvatar url={avatar_url} size={48} alt={`Foto de perfil de ${nombre}`} />
      <div className="player-row-info">
        <h3 className="player-row-name">{nombre}</h3>
        <p className="player-row-role">{rol_favorito || 'Sin rol favorito'}</p>
      </div>
      {earnedBadges.length > 0 && (
        <div className="player-row-badges">
          {earnedBadges.map(({ key, label, image, description }) => (
            <Tooltip key={key} text={`${label}: ${description}`}>
              <img src={image} alt={label} className="player-row-badge-img" />
            </Tooltip>
          ))}
        </div>
      )}
      <span className="player-row-arrow">→</span>
    </Link>
  );
};

export default PlayerRow;
