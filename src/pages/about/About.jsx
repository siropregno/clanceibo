import React from 'react';
import { Helmet } from 'react-helmet';
import Photogallery from '../../components/component-photogallery/photogallery';
import './about.css'; // Assuming you have a CSS file for styling

const About = () => {
  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Sobre nosotros</title>
      </Helmet>
      <div className="about-container">
        <div className='about-banner'>
          <h1>¿Quienes somos?</h1>
          <p>
            Somos un grupo chico, con pasión por Arma 3. Jugamos a nuestra manera. No hacemos roleplay ni nos vestimos de general en el living, pero nos tomamos en serio lo que importa: el trabajo en equipo, el uso realista del equipo argentino y pasarla bien entre amigos.
            Nos gusta que las cosas tengan sentido, sin perder la onda. Si te cabe la idea de sumarte a un grupo que encara las misiones con seriedad pero sin perder el humor, este es tu lugar.
          </p>
          <p>Nos movemos con un conjunto de mods privados hechos a medida para nuestro estilo de juego. Alternamos entre partidas dinámicas como Dynamic Recon Ops y misiones personalizadas que armamos en caliente con Zeus.</p>
        </div>  
        <Photogallery />  
      </div>
    </>
  )
};

export default About;