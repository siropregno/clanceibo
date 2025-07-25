import React from 'react';
import './discordbtn.css';
import { FaDiscord } from 'react-icons/fa';

const DiscordButton = () => {
  return (
    <a href="https://discord.gg/5THPM4JFXQ" className="discord-button" target="_blank" rel="noopener noreferrer">
      <FaDiscord className="discord-icon" />
      Discord
    </a>
  );
};

export default DiscordButton;
