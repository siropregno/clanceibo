import React from 'react';
import { Helmet } from 'react-helmet-async';
import Photogallery from '@components/component-photogallery/photogallery';
import './about.css'; // Assuming you have a CSS file for styling

const About = () => {
  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Sobre nosotros</title>
      </Helmet>
      <div className="about-container">
          <div className="about-header">
          <h1>¿Quienes somos?</h1>
          <p>
            Somos un grupo chico, con pasión por Arma 3. Jugamos a nuestra manera. No hacemos roleplay ni nos vestimos de general en el living, pero nos tomamos en serio lo que importa: el trabajo en equipo, el uso realista del equipo argentino y pasarla bien entre amigos.
            Nos gusta que las cosas tengan sentido, sin perder la onda. Si te cabe la idea de sumarte a un grupo que encara las misiones con seriedad pero sin perder el humor, este es tu lugar.
          </p><p>Nos movemos con un conjunto de mods privados hechos a medida para nuestro estilo de juego. Alternamos entre partidas dinámicas en un mapa creado por nosotros y misiones personalizadas que armamos sobre la marcha con Zeus.</p>
          <div className="about-features">
            <p>Misiones todos los viernes desde las 21:00 horas (Mini misiones semanales si hay quorum)</p>
            <p>Servidor abierto las 24 horas con eventos dinamicos</p>
          </div>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdvd7Ihf_6Y4rFKhjS_HiYJhiJP4CBkZTG-TxurcNSoevpQ2g/viewform?usp=dialog" target="_blank" rel="noopener noreferrer">
            <button className="btn-green">
              ¡Quiero unirme!
            </button>
          </a>
        </div>  
        <Photogallery />  
      </div>
    </>
  )
};

export default About;