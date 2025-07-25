import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './navbar.css';
import DiscordButton from '@components/component-discordbtn/discordbtn';
import logo from '@assets/images/logo.png';

const Navbar = () => {
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false); // State for hamburger menu

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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen); // Toggle the menu state
  };

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
            <NavLink to="/">
              <img className='nav-logo' src={logo} alt="Logo" />
              <h2>CLAN CEIBO</h2>
            </NavLink>
          </div>
          <div className="hamburger-menu" onClick={toggleMenu}>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <ul className={menuOpen ? 'active' : ''}>
            <li>
              <NavLink className="nav-link" to="/" onClick={() => setMenuOpen(false)}>Inicio</NavLink>
            </li>
            <li>
              <NavLink className="nav-link" to="/About" onClick={() => setMenuOpen(false)}>Sobre nosotros</NavLink>
            </li>
            <li>
              <NavLink className="nav-link" to="/Armory" onClick={() => setMenuOpen(false)}>Loadouts</NavLink>
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