import React from 'react';
import { Helmet } from 'react-helmet';
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

import Heli1 from '@assets/images/icons/heli1.png';
import Heli2 from '@assets/images/icons/heli2.png';
import Heli3 from '@assets/images/icons/heli3.png';


import CoComandos from '@assets/images/icons/co-comandos.png';

const Orbat = () => {
  const brigades = [
    {
      id: 1,
      name: "Brigada aerotransportada",
      description: "Airborne brigade",
      photo: BrAerotransportada,
      members: [
        { id: 1, name: "Regimiento de Asalto Aereo 601", photo: RegAsaltoAereo }
      ]
    },
    {
      id: 2,
      name: "Brigada mecanizada",
      description: "Mechanized brigade",
      photo: BrMecanizada,
      members: [
        {name: "Regimiento de Infantería Mecanizada", photo: RegInfanteriaMecanizada },
        {name: "Regimiento de Caballería de Tanques", photo: RegTanques }
      ]
    },
    {
      id: 3,
      name: "Brigada de monte",
      photo: BrMonte,
      description: "Bush brigade",
      members: [
        {name: "Regimiento de infantería de Monte", photo: RegInfanteriaMontanaMonte },
      ]
    },
    {
      id: 4,
      name: "Brigada de montaña",
      photo: BrMontana,
      description: "Mountain brigade",
      members: [
        {name: "Regimiento de Infantería de Montaña", photo: RegInfanteriaMontanaMonte }
      ]
    },
    {
      id: 5,
      name: "Agrupación de F.O.E. 601",
      photo: GrAfoe,
      description: "Special Ops group",
      members: [
        {name: "Compañía de Comandos 601", photo: CoComandos },
        {name: "Compañía de Comandos 602", photo: CoComandos },
        {name: "Compañía de Comandos 603", photo: CoComandos }
      ]
    },
    {
      id: 6,
      name: "Agr. de aviación de Ejército",
      description: "Army Aviation grouping",
      photo: GrAviacion,
      members: [
        {name: "Batallón de Helicópteros de Asalto 601", photo: Heli1 },
        {name: "Escuadrón de Aviación de Exploración y Ataque 602", photo: Heli2 },
        {name: "Sección de Aviación de Ejército de Montaña", photo: Heli3 }
      ]
    }
  ];

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
                    <div key={member.id} className="member-item">
                      <img src={member.photo} alt={member.name} className="member-photo" />
                      <span className="member-name">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
};

export default Orbat;