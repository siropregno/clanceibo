import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import './armory.css';
import LoadoutCard from '@components/component-loadoutcard/LoadoutCard';
import InfRifleman from '@assets/images/loadouts/infanteria-rifleman.png';
import InfMedic from '@assets/images/loadouts/infanteria-medic.png';
import InfSniper from '@assets/images/loadouts/infanteria-sniper.png';
import Comandos601DDM4A1 from '@assets/images/loadouts/comandos601-ddm4a1.png';
import Comandos601SMG from '@assets/images/loadouts/comandos601-smg.png';
import Comandos601MG from '@assets/images/loadouts/comandos601-mg.png';
import Comandos601SNIPER from '@assets/images/loadouts/comandos601-sniper.png';
import ImaraRifleman from '@assets/images/loadouts/imara-rifleman.png';
import GoeSpecOps from '@assets/images/loadouts/goe-specops.png';
import AsaltoAereo601Fusilero from '@assets/images/loadouts/asaltoaereo601-rifleman.png';
import AsaltoAereo601MG from '@assets/images/loadouts/asaltoaereo601-mg.png';

const Armory = () => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(''); // State for org filter
  const [selectedRole, setSelectedRole] = useState(''); // State for role filter
  const [selectedBranch, setSelectedBranch] = useState(''); // State for branch filter

  const validPasswords = ['13248'];

  const handleAccess = () => {
    if (validPasswords.includes(password)) {
      setIsAuthorized(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  // Loadout data
  const loadouts = [
    {
      branch: 'Ejercito',
      org: 'Infantería',
      role: 'Fusilero',
      image: InfRifleman,
      primary: 'FN FAL 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    { 
      branch: 'Ejercito',
      org: 'Infantería',
      role: 'Médico',
      image: InfMedic,
      primary: 'FN FAL 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: 'Ejercito',
      org: 'Infantería',
      role: 'DMR',
      image: InfSniper,
      primary: 'SSG 69 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    { 
      branch: 'Ejercito (SpecOps)',
      org: 'Comandos 601',
      role: 'Fusilero',
      image: Comandos601DDM4A1,
      primary: 'DDM4A1 5.56mm',
      secondary: 'Glock 17 9mm',
    },
    { 
      branch: 'Ejercito (SpecOps)',
      org: 'Comandos 601',
      role: 'SMG',
      image: Comandos601SMG,
      primary: 'APC9 9mm',
      secondary: 'Glock 17 9mm',
    },
    { 
      branch: 'Ejercito (SpecOps)',
      org: 'Comandos 601',
      role: 'MG',
      image: Comandos601MG,
      primary: 'M249 5.56mm',
      secondary: 'Glock 17 9mm',
    },
    { 
      branch: 'Ejercito (SpecOps)',
      org: 'Comandos 601',
      role: 'DMR',
      image: Comandos601SNIPER,
      primary: 'DD5V4 7.62mm',
      secondary: 'Glock 17 9mm',
    },
    { 
      branch: 'Ejercito',
      org: 'Asalto Aereo 601',
      role: 'Fusilero',
      image: AsaltoAereo601Fusilero,
      primary: 'FAMCA 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: 'Ejercito',
      org: 'Asalto Aereo 601',
      role: 'MG',
      image: AsaltoAereo601MG,
      primary: 'FN MAG 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: 'Armada',
      org: 'IMARA',
      role: 'Fusilero',
      image: ImaraRifleman,
      primary: 'M16A2 5.56mm',
      launcher: '',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: 'Fuerza Aerea (SpecOps)',
      org: 'G.O.E.',
      role: 'Fuerzas Especiales',
      image: GoeSpecOps,
      primary: 'DDMK18 5.56mm',
      launcher: '',
      secondary: 'Glock 17 9mm',
    },
  ];

  // Get unique orgs, roles, and branches for dropdowns
  const uniqueOrgs = [...new Set(loadouts.map((loadout) => loadout.org))];
  const uniqueRoles = [...new Set(loadouts.map((loadout) => loadout.role))];
  const uniqueBranches = [...new Set(loadouts.map((loadout) => loadout.branch))];

  // Filtered loadouts based on selected org, role, and branch
  const filteredLoadouts = loadouts.filter(
    (loadout) =>
      (selectedOrg === '' || loadout.org === selectedOrg) &&
      (selectedRole === '' || loadout.role === selectedRole) &&
      (selectedBranch === '' || loadout.branch === selectedBranch)
  );

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Loadouts</title>
      </Helmet>

      {!isAuthorized ? (
        <div className="password-container">
          <p>Ingresa el codigo para acceder a esta seccion:</p>
          <div className="password-container-input">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleAccess}>Acceder</button>
          </div>
        </div>
      ) : (
        <div className="authorized-content">
          <h1>Loadouts</h1>

          {/* Filter Dropdowns */}
          <div className="filter-container">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">Filtrar por rama</option>
              {uniqueBranches.map((branch, index) => (
                <option key={index} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Filtrar por rol</option>
              {uniqueRoles.map((role, index) => (
                <option key={index} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              <option value="">Filtrar por unidad</option>
              {uniqueOrgs.map((org, index) => (
                <option key={index} value={org}>
                  {org}
                </option>
              ))}
            </select>

            {/* Botón para limpiar los filtros */}
            <button
              className="clear-filters-button"
              onClick={() => {
                setSelectedBranch('');
                setSelectedRole('');
                setSelectedOrg('');
              }}
            >
              Limpiar Filtros
            </button>
          </div>

          {/* Loadout Cards */}
          <div className="loadout-cards-container">
            {filteredLoadouts.map((loadout, index) => (
              <LoadoutCard
                key={index}
                branch={loadout.branch}
                org={loadout.org}
                role={loadout.role}
                image={loadout.image}
                primary={loadout.primary}
                launcher={loadout.launcher}
                secondary={loadout.secondary}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Armory;