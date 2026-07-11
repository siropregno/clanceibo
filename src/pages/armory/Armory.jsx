import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import './armory.css';
import LoadoutCard from '@components/component-loadoutcard/loadoutcard';
import InfRifleman from '@assets/images/loadouts/infanteria-rifleman.png';
import InfMedic from '@assets/images/loadouts/infanteria-medic.png';
import InfSniper from '@assets/images/loadouts/infanteria-sniper.png';
import Comandos601DDM4A1 from '@assets/images/loadouts/comandos601-ddm4a1.png';
import Comandos601SMG from '@assets/images/loadouts/comandos601-smg.png';
import Comandos601MG from '@assets/images/loadouts/comandos601-mg.png';
import Comandos601SNIPER from '@assets/images/loadouts/comandos601-sniper.png';
import AsaltoAereo601Fusilero from '@assets/images/loadouts/asaltoaereo601-rifleman.png';
import AsaltoAereo601MG from '@assets/images/loadouts/asaltoaereo601-mg.png';

// Definición de ramas y unidades
const BRANCHES = {
  EJERCITO: 'Ejercito',
  ARMADA: 'Armada',
  FUERZA_AEREA: 'Fuerza Aerea',
};

const UNITS = {
  // Ejercito - Infantería
  REG_INF_MONTE: { name: 'Regimiento de Infantería de Monte', branch: BRANCHES.EJERCITO },
  REG_INF_MONTAÑA: { name: 'Regimiento de Infantería de Montaña', branch: BRANCHES.EJERCITO },
  REG_CAB_TANQUES: { name: 'Regimiento de Caballería de Tanques', branch: BRANCHES.EJERCITO },
  REG_INF_MECANIZADA: { name: 'Regimiento de Infantería Mecanizada', branch: BRANCHES.EJERCITO },
  // Ejercito - Operaciones Especiales
  REG_ASALTO_601: { name: 'Regimiento de Asalto Aéreo 601', branch: BRANCHES.EJERCITO },
  CIA_COMANDOS_601: { name: 'Compañía de Comandos 601', branch: BRANCHES.EJERCITO, specOps: true },
  // Ejercito - Aviación
  BAT_HELI_ASALTO_601: { name: 'Batallón de Helicópteros de Asalto 601', branch: BRANCHES.EJERCITO },
  BAT_AVI_APOYO_601: { name: 'Batallón de Aviación de Apoyo de Combate 601', branch: BRANCHES.EJERCITO },
  ESC_AVI_EXPLOR_602: { name: 'Escuadrón de Aviación de Exploración y Ataque 602', branch: BRANCHES.EJERCITO },
  SEC_AVI_MONTAÑA: { name: 'Sección de Aviación de Ejército de Montaña', branch: BRANCHES.EJERCITO },
};

// Helper para obtener unidades únicas de los loadouts
const getUniqueUnits = (loadouts) => {
  const unitSet = new Set();
  loadouts.forEach(loadout => {
    loadout.units.forEach(unitKey => {
      if (UNITS[unitKey]) {
        unitSet.add(unitKey);
      }
    });
  });
  return Array.from(unitSet).map(key => ({ key, ...UNITS[key] }));
};

const Armory = () => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingCopyCallback, setPendingCopyCallback] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('REG_INF_MONTE');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showPopup, setShowPopup] = useState(false); // State for popup visibility

  const validPasswords = ['13248'];

  const handlePasswordSubmit = () => {
    if (validPasswords.includes(password)) {
      setIsAuthorized(true);
      setShowPasswordModal(false);
      setPassword('');
      // Execute the pending copy action
      if (pendingCopyCallback) {
        pendingCopyCallback();
        setPendingCopyCallback(null);
      }
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleCopy = () => {
    if (!isAuthorized) {
      // Show password modal and store the copy action for later
      setPendingCopyCallback(() => () => {
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      });
      setShowPasswordModal(true);
    } else {
      setShowPopup(true); // Show the popup
      setTimeout(() => setShowPopup(false), 3000); // Hide the popup after 3 seconds
    }
  };

  const loadouts = [
    // Infantería de Monte / Montaña - Loadouts básicos
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Rifleman',
      image: InfRifleman,
      primary: 'FN FAL 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Combat Life Saver',
      image: InfMedic,
      primary: 'FN FAL 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Marksman',
      image: InfSniper,
      primary: 'SSG 69 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Team Leader',
      image: '',
      primary: 'FAMA M203 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Squad Leader',
      image: '',
      primary: 'FAMA 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_INF_MONTE', 'REG_INF_MONTAÑA'],
      role: 'Radio Operator',
      image: '',
      primary: 'FN FAL 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    
    // Infantería de montaña - Loadouts básicos

    // Infanteria Mecanizada / Tanques - Loadouts básicos

    // Comandos 601
    { 
      branch: BRANCHES.EJERCITO,
      units: ['CIA_COMANDOS_601'],
      role: 'Rifleman',
      image: Comandos601DDM4A1,
      primary: 'DDM4A1 5.56mm',
      secondary: 'Glock 17 9mm',
      specOps: true,
    },
    { 
      branch: BRANCHES.EJERCITO,
      units: ['CIA_COMANDOS_601'],
      role: 'Submachinegunner',
      image: Comandos601SMG,
      primary: 'APC9 9mm',
      secondary: 'Glock 17 9mm',
      specOps: true,
    },
    { 
      branch: BRANCHES.EJERCITO,
      units: ['CIA_COMANDOS_601'],
      role: 'Autorifleman',
      image: Comandos601MG,
      primary: 'M249 5.56mm',
      secondary: 'Glock 17 9mm',
      specOps: true,
    },
    { 
      branch: BRANCHES.EJERCITO,
      units: ['CIA_COMANDOS_601'],
      role: 'Marksman',
      image: Comandos601SNIPER,
      primary: 'DD5V4 7.62mm',
      secondary: 'Glock 17 9mm',
      specOps: true,
    },
    // Regimiento de Asalto Aéreo 601
    { 
      branch: BRANCHES.EJERCITO,
      units: ['REG_ASALTO_601'],
      role: 'Rifleman',
      image: AsaltoAereo601Fusilero,
      primary: 'FAMCA 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_ASALTO_601'],
      role: 'Autorifleman',
      image: AsaltoAereo601MG,
      primary: 'FN MAG 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    // Crewman - compartido entre mecanizada y tanques
    // TODO: Agregar imagen de crewman
    {
      branch: BRANCHES.EJERCITO,
      units: ['REG_CAB_TANQUES', 'REG_INF_MECANIZADA'],
      role: 'Crewman',
      image: "",
      primary: 'FN FAL Para 7.62mm',
      secondary: 'Hi-Power 9mm',
    },
    // Piloto de Helicóptero - compartido entre unidades de aviación
    // TODO: Agregar imagen de piloto
    {
      branch: BRANCHES.EJERCITO,
      units: ['BAT_HELI_ASALTO_601', 'BAT_AVI_APOYO_601', 'ESC_AVI_EXPLOR_602', 'SEC_AVI_MONTAÑA'],
      role: 'Helicopter Pilot',
      image: "",
      primary: 'N/A',
      secondary: 'Glock 17 9mm',
    }
  ];

  // Filtrar loadouts que no son "próximamente" para las opciones
  const activeLoadouts = loadouts.filter(l => !l.comingSoon);
  const uniqueUnits = getUniqueUnits(activeLoadouts);
  const uniqueRoles = [...new Set(activeLoadouts.map((loadout) => loadout.role))];
  const uniqueBranches = Object.values(BRANCHES);

  const filteredLoadouts = loadouts.filter((loadout) => {
    // Filtro por rama
    const matchesBranch = selectedBranch === '' || loadout.branch === selectedBranch;
    
    // Filtro por unidad - verifica si alguna de las unidades del loadout coincide
    const matchesUnit = selectedUnit === '' || loadout.units.includes(selectedUnit);
    
    // Filtro por rol
    const matchesRole = selectedRole === '' || loadout.role === selectedRole;
    
    return matchesBranch && matchesUnit && matchesRole;
  });

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Loadouts</title>
      </Helmet>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <p>Ingresa el codigo para copiar el loadout:</p>
            <div className="password-container-input">
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <button onClick={handlePasswordSubmit}>Acceder</button>
            </div>
            <button className="cancel-button" onClick={() => {
              setShowPasswordModal(false);
              setPassword('');
              setPendingCopyCallback(null);
            }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="authorized-content">
        <h1>Loadouts</h1>

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
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
          >
            <option value="">Seleccionar unidad</option>
            {uniqueUnits.map((unit) => (
              <option key={unit.key} value={unit.key}>
                {unit.name}
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

          

          <button
            className="clear-filters-button"
            onClick={() => {
              setSelectedBranch('');
              setSelectedRole('');
              setSelectedUnit('');
            }}
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="loadout-cards-container">
          {!selectedUnit ? (
            <div className="select-unit-message">
              <p>Seleccioná una unidad para ver los loadouts disponibles</p>
            </div>
          ) : filteredLoadouts.length === 0 ? (
            <div className="select-unit-message">
              <p>No hay loadouts disponibles para esta selección</p>
            </div>
          ) : (
            filteredLoadouts.map((loadout, index) => (
              <LoadoutCard
                key={index}
                branch={loadout.branch}
                role={loadout.role}
                image={loadout.image}
                primary={loadout.primary}
                launcher={loadout.launcher}
                secondary={loadout.secondary}
                specOps={loadout.specOps}
                comingSoon={loadout.comingSoon}
                onCopy={handleCopy}
              />
            ))
          )}
        </div>

        {/* Popup Notification */}
        {showPopup && (
          <div className="popup-notification">
            <p>¡Loadout copiado al portapapeles!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Armory;