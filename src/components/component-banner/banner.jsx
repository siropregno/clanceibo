import React, { useState, useEffect } from 'react';
import './banner.css';
import { FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import img6 from '@assets/images/box/img6.png';
import img9 from '@assets/images/box/img9.png';
import img3 from '@assets/images/box/img3.png';

const images = [img6, img9, img3];

const Banner = () => {
  const navigate = useNavigate();
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div
        className="banner"
        style={{
          backgroundImage: `url(${images[bgIndex]})`,
          transition: 'background-image 0.5s ease-in-out',
          position: 'relative', // Add this
          overflow: 'hidden'    // Add this for safety
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '30%',
            width: '70%',
            height: '100%',
            background: `linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1))`,
            zIndex: 1
          }}
        />
        <div className="banner-content" style={{ position: 'relative', zIndex: 2 }}>
          <h1>CEIBO TE ESTA BUSCANDO</h1>
          <h1 style={{ color: 'var(--cel)' }}>ENLISTATE HOY</h1>
          <p>
            Operaciones dinámicas y una forma de jugar que mezcla táctica con diversión. <br />
            Conocé mas sobre quienes somos y como unirte a nosotros.
          </p>
          <div className="botones-div">
            <button className="btn-amarillo" onClick={() => navigate('/orbat')}>
              Conoce nuestro ORBAT acá
            </button>
            <button className='btn-blanco' onClick={() => navigate('/about')}>
              Saber más
              <FaArrowRight style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Banner;