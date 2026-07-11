import React from 'react';
import { Link } from 'react-router-dom';
import './playerrow.css';
import { GiCrosshair, GiMedicalPack, GiMortar } from 'react-icons/gi';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';

const BADGES = [
  { key: 'apt_tirador', label: 'Tirador especial', Icon: GiCrosshair },
  { key: 'apt_medico', label: 'Medicina de combate', Icon: GiMedicalPack },
  { key: 'apt_mortero', label: 'Morterista', Icon: GiMortar },
];

const PlayerRow = ({ player }) => {
  const { id, nombre, rol_favorito, avatar_url } = player;
  const earnedBadges = BADGES.filter(({ key }) => player[key]);
  return (
    <Link className="player-row" to={`/roster/${id}`}>
      <PlayerAvatar url={avatar_url} size={48} alt={`Foto de perfil de ${nombre}`} />
      <div className="player-row-info">
        <h3 className="player-row-name">{nombre}</h3>
        <p className="player-row-role">{rol_favorito || 'Sin rol favorito'}</p>
      </div>
      {earnedBadges.length > 0 && (
        <div className="player-row-badges">
          {earnedBadges.map(({ key, label, Icon }) => (
            <span key={key} className="badge-chip sm earned" title={label}>
              <Icon />
            </span>
          ))}
        </div>
      )}
      <span className="player-row-arrow">→</span>
    </Link>
  );
};

export default PlayerRow;
