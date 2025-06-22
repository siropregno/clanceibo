import React from 'react';
import './discordbtn.css';
import { FaDiscord } from 'react-icons/fa';

const DiscordButton = () => {
  return (
    <a href="https://discord.gg/tu-enlace-de-discord" className="discord-button">
      <FaDiscord className="discord-icon" />
      Discord
    </a>
  );
};

export default DiscordButton;
