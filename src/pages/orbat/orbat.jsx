import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './orbat.css';

import BrAerotransportada from '@assets/images/icons/br-aerotransportada.png';
import BrMontana from '@assets/images/icons/br-montana-monte.png';
import BrMonte from '@assets/images/icons/br-montana-monte.png';
import BrMecanizada from '@assets/images/icons/br-mecanizada.png';
import GrAviacion from '@assets/images/icons/gr-aviacion.png';
import GrAfoe from '@assets/images/icons/gr-afoe.png';

import RegAsaltoAereo from '@assets/images/icons/reg-asalto-aereo-601.png';
import RegInfanteriaMecanizada from '@assets/images/icons/reg-infanteria-mecanizada.png';
import RegTanques from '@assets/images/icons/reg-caballeria-tanques.png';
import RegInfanteriaMontanaMonte from '@assets/images/icons/reg-infanteria-montana-monte.png';

import aviacionApoyo from '@assets/images/icons/aviacion-apoyo.png';
import Heli1 from '@assets/images/icons/heli1.png';
import Heli2 from '@assets/images/icons/Heli2.png';
import Heli3 from '@assets/images/icons/Heli3.png';


import CoComandos from '@assets/images/icons/co-comandos.png';

const Orbat = () => {
  const [selectedMember, setSelectedMember] = useState(null);

  const brigades = [
    {
      id: 1,
      name: "Brigada aerotransportada",
      description: "Airborne brigade",
      photo: BrAerotransportada,
      members: [
        { 
          id: 1, 
          name: "Regimiento de Asalto Aereo 601", 
          photo: RegAsaltoAereo,
          description: "Unidad de élite especializada en operaciones aerotransportadas y asalto aéreo. Capacidad de despliegue rápido en cualquier terreno.",
          roles: ["Rifleman", "Combat Life Saver", "Autorifleman", "Grenadier", "Team Leader", "Squad Leader"]
        }
      ]
    },
    {
      id: 2,
      name: "Brigada mecanizada",
      description: "Mechanized brigade",
      photo: BrMecanizada,
      members: [
        {
          id: 2,
          name: "Regimiento de Infantería Mecanizada", 
          photo: RegInfanteriaMecanizada,
          description: "Infantería equipada con vehículos blindados de transporte. Combina movilidad y potencia de fuego.",
          roles: ["Rifleman", "Combat Life Saver", "Crewman", "Autorifleman", "Team Leader"]
        },
        {
          id: 3,
          name: "Regimiento de Caballería de Tanques", 
          photo: RegTanques,
          description: "Unidad blindada con tanques de combate principal. Máxima potencia de fuego y protección.",
          roles: ["Crewman", "Tank Commander", "Gunner", "Driver"]
        }
      ]
    },
    {
      id: 3,
      name: "Brigada de monte",
      photo: BrMonte,
      description: "Bush brigade",
      members: [
        {
          id: 4,
          name: "Regimiento de infantería de Monte", 
          photo: RegInfanteriaMontanaMonte,
          description: "Infantería especializada en operaciones en terreno selvático y monte cerrado. Expertos en supervivencia y combate en jungla.",
          roles: ["Rifleman", "Combat Life Saver", "Marksman", "Autorifleman", "Grenadier", "Team Leader", "Squad Leader"]
        },
      ]
    },
    {
      id: 4,
      name: "Brigada de montaña",
      photo: BrMontana,
      description: "Mountain brigade",
      members: [
        {
          id: 5,
          name: "Regimiento de Infantería de Montaña", 
          photo: RegInfanteriaMontanaMonte,
          description: "Infantería especializada en operaciones en alta montaña. Entrenados para condiciones extremas de frío y altura.",
          roles: ["Rifleman", "Combat Life Saver", "Marksman", "Autorifleman", "Grenadier", "Team Leader", "Squad Leader"]
        }
      ]
    },
    {
      id: 5,
      name: "Agrupación de F.O.E. 601",
      photo: GrAfoe,
      description: "Special Ops group",
      members: [
        {
          id: 6,
          name: "Compañía de Comandos 601", 
          photo: CoComandos,
          description: "Fuerzas especiales de élite. Operaciones de acción directa, reconocimiento especial y rescate de rehenes.",
          roles: ["Rifleman", "Combat Life Saver", "Marksman", "Autorifleman", "Submachinegunner", "Breacher", "Team Leader"]
        },
        {
          id: 7,
          name: "Compañía de Comandos 602", 
          photo: CoComandos,
          description: "Fuerzas especiales de élite. Operaciones de acción directa, reconocimiento especial y rescate de rehenes.",
          roles: ["Rifleman", "Combat Life Saver", "Marksman", "Autorifleman", "Submachinegunner", "Breacher", "Team Leader"]
        },
        {
          id: 8,
          name: "Compañía de Comandos 603", 
          photo: CoComandos,
          description: "Fuerzas especiales de élite. Operaciones de acción directa, reconocimiento especial y rescate de rehenes.",
          roles: ["Rifleman", "Combat Life Saver", "Marksman", "Autorifleman", "Submachinegunner", "Breacher", "Team Leader"]
        }
      ]
    },
    {
      id: 6,
      name: "Agr. de aviación de Ejército",
      description: "Army Aviation grouping",
      photo: GrAviacion,
      members: [
        {
          id: 9,
          name: "Batallón de Helicópteros de Asalto 601", 
          photo: Heli1,
          description: "Helicópteros de transporte y asalto. Inserción y extracción de tropas en zonas de combate.",
          roles: ["Helicopter Pilot", "Co-Pilot", "Door Gunner", "Crew Chief"]
        },
        {
          id: 10,
          name: "Batallón de Aviación de Apoyo de Combate 601", 
          photo: aviacionApoyo,
          description: "Apoyo aéreo cercano y transporte logístico. Helicópteros de carga y utilitarios.",
          roles: ["Helicopter Pilot", "Co-Pilot", "Loadmaster"]
        },
        {
          id: 11,
          name: "Escuadrón de Aviación de Exploración y Ataque 602", 
          photo: Heli2,
          description: "Helicópteros de ataque y reconocimiento armado. Apoyo de fuego y destrucción de blindados.",
          roles: ["Helicopter Pilot", "Gunner/Co-Pilot"]
        },
        {
          id: 12,
          name: "Sección de Aviación de Ejército de Montaña", 
          photo: Heli3,
          description: "Operaciones aéreas en alta montaña. Rescate, evacuación y apoyo en terreno difícil.",
          roles: ["Helicopter Pilot", "Co-Pilot", "Crew Chief"]
        }
      ]
    }
  ];

  const handleMemberClick = (member) => {
    setSelectedMember(member);
  };

  const handleBackClick = () => {
    setSelectedMember(null);
  };

  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Orbat</title>
      </Helmet>
      <div className="orbat-container">
        <div className="orbat-header">
          <h1>Orbat</h1>
          <p className="orbat-subtitle">
            Elegi la brigada que más se adapte a tu estilo de juego y formá parte de nuestro grupo.
          </p>
        </div>
        <div className='orbat-content'>
          {selectedMember ? (
            // Vista de detalle del member
            <div className="member-detail-container">
              <div className="member-detail-card">
                <div className="member-detail-image">
                  <img src={selectedMember.photo} alt={selectedMember.name} />
                </div>
                <div className="member-detail-info">
                  <h2 className="member-detail-title">{selectedMember.name}</h2>
                  <p className="member-detail-description">{selectedMember.description}</p>
                  <div className="member-detail-roles">
                    <h3>Roles disponibles:</h3>
                    <div className="roles-list">
                      {selectedMember.roles.map((role, index) => (
                        <span key={index} className="role-tag">{role}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn-amarillo" onClick={handleBackClick}>
                ← Volver al Orbat
              </button>
            </div>
          ) : (
            // Vista de grid normal
            <div className="orbat-grid">
              {brigades.map((brigade) => (
                <div key={brigade.id} className="brigade-column">
                  <div className="brigade-header">
                    <img src={brigade.photo} alt={brigade.name} className="brigade-photo" />
                    <div className="brigade-info">
                      <p className="brigade-name">{brigade.name}</p>
                      <p className="brigade-description">{brigade.description}</p>
                    </div>
                    
                  </div>
                  
                  <div className="brigade-members">
                    {brigade.members.map((member) => (
                      <div 
                        key={member.id} 
                        className="member-item"
                        onClick={() => handleMemberClick(member)}
                      >
                        <img src={member.photo} alt={member.name} className="member-photo" />
                        <span className="member-name">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
};

export default Orbat;