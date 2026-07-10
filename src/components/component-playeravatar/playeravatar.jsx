import React from 'react';
import './playeravatar.css';
import { FaUserCircle } from 'react-icons/fa';

const PlayerAvatar = ({ url, size = 40, alt = 'Foto de perfil' }) => {
  const style = { width: size, height: size };
  if (url) {
    return <img className="player-avatar" style={style} src={url} alt={alt} />;
  }
  return <FaUserCircle className="player-avatar player-avatar-fallback" style={style} data-testid="avatar-fallback" />;
};

export default PlayerAvatar;
