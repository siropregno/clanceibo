import React from 'react';
import './loadoutcard.css';
import IconRifle from '@assets/images/icons/rifle.png';
import IconPistol from '@assets/images/icons/gun.png';
import IconLauncher from '@assets/images/icons/launcher.png';
import { IoMdMale, IoMdFemale } from 'react-icons/io';
import { FaShieldAlt, FaMedkit } from 'react-icons/fa'; // Example icons

const LoadoutCard = ({branch, org, role, image, primary, launcher, secondary }) => {
  return (
    <div className="loadout-card">
      <div className="loadout-card-image">
        <img src={image} alt="Loadout" />
      </div>
      <div className="loadout-card-details">
        <h3>
          {org} - {role}
        </h3>
        <div className="loadout-card-details-container">
          <div className="loadout-card-details-weapon">
            <img className="loadout-card-icon" src={IconRifle} alt="Rifle Icon" />
            <p>{primary}</p>
          </div>
          {launcher && (
            <div className="loadout-card-details-weapon">
              <img className="loadout-card-icon" src={IconLauncher} alt="Launcher Icon" />
              <p>{launcher}</p>
            </div>
          )}
          <div className="loadout-card-details-weapon">
            <img className="loadout-card-icon" src={IconPistol} alt="Pistol Icon" />
            <p>{secondary}</p>
          </div>
        </div>
        <div className="loadout-card-icons">
        <div className={`circle-icon`}>
          <p>{branch}</p>
        </div>
      </div>
        <p className="texto-copiar">Copia este loadout:</p>
        <div className="loadout-card-details-copy">
          <button>
            <IoMdMale />
          </button>
          <button>
            <IoMdFemale />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadoutCard;