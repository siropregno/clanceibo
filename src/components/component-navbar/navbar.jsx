import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './navbar.css'
import DiscordButton from '../component-discordbtn/discordbtn';

const Navbar = () => {
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY) {
        setHideOnScroll(true); // scrolling down
      } else {
        setHideOnScroll(false); // scrolling up
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector('.nav-container');
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className="nav-container">
        <div className={`nav-text-container${hideOnScroll ? ' hide' : ''}`}>
          <div className='whstripe' style={{ height: '100%', width: '33%' }}>
            <p className='nav-text'>Comunidad de Arma 3 - Soft milsim argentino papa!</p>
          </div>
        </div>
        <div className='nav-content'>
          <div className='logo-container'>
            <NavLink to="/Home">
              <img className='nav-logo' src="src\assets\images\logo.png" alt="" />
              <h2>CLAN CEIBO</h2>
            </NavLink>
            
          </div>
          <ul>
            <li>
              <NavLink className="nav-link" to="/Home">Inicio</NavLink>
            </li>
            <li>
              <NavLink className="nav-link" to="/About">Sobre nosotros</NavLink>
            </li>
            <li>
              <NavLink className="nav-link" to="/Armory">Equipamiento</NavLink>
            </li>
            <li>
              <a className='nav-link' href="" target="_blank" rel="noopener noreferrer">Quiero sumarme</a>
            </li>
            <li>
              <DiscordButton />
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Navbar;