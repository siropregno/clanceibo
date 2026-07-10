import React from 'react';
import './playercard.css';
import { GiCrosshair, GiMedicalPack, GiMortar } from 'react-icons/gi';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';

const PlayerCard = ({ player, onSelect }) => {
  const { nombre, rol_favorito, avatar_url, apt_tirador, apt_medico, apt_mortero } = player;
  return (
    <div className="player-card" onClick={() => onSelect(player)}>
      <PlayerAvatar url={avatar_url} size={72} alt={`Foto de perfil de ${nombre}`} />
      <div className="player-card-header">
        <h3 className="player-card-name">{nombre}</h3>
        <p className="player-card-role">{rol_favorito || 'Sin rol favorito'}</p>
      </div>
      <div className="player-card-badges">
        <span className={`badge-chip${apt_tirador ? ' earned' : ''}`} title="Tirador especial">
          <GiCrosshair />
        </span>
        <span className={`badge-chip${apt_medico ? ' earned' : ''}`} title="Medicina de combate">
          <GiMedicalPack />
        </span>
        <span className={`badge-chip${apt_mortero ? ' earned' : ''}`} title="Morterista">
          <GiMortar />
        </span>
      </div>
      <button
        className="btn-amarillo player-card-btn"
        onClick={(e) => { e.stopPropagation(); onSelect(player); }}
      >
        Ver perfil
      </button>
    </div>
  );
};

export default PlayerCard;
