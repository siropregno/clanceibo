import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './navbar.css';
import DiscordButton from '@components/component-discordbtn/discordbtn';
import logo from '@assets/images/logo.png';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@lib/supabaseClient';
import PlayerAvatar from '@components/component-playeravatar/playeravatar';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false); // State for hamburger menu
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const goToAuth = (mode) => {
    setMenuOpen(false);
    navigate('/ingresar', { state: { mode } });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfileMenuOpen(false);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

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
              <NavLink className="nav-link" to="/about" onClick={() => setMenuOpen(false)}>Sobre nosotros</NavLink>
            </li>
            {/* Loadouts - Oculto temporalmente
            <li>
              <NavLink className="nav-link" to="/armory" onClick={() => setMenuOpen(false)}>Loadouts</NavLink>
            </li>
            */}
            <li>
              <NavLink className="nav-link" to="/orbat" onClick={() => setMenuOpen(false)}>Orbat</NavLink>
            </li>
            <li>
              <NavLink className="nav-link" to="/roster" onClick={() => setMenuOpen(false)}>Roster</NavLink>
            </li>
            {session ? (
              <li className="navbar-profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className="navbar-profile-trigger"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-expanded={profileMenuOpen}
                >
                  <PlayerAvatar url={profile?.avatar_url} size={32} alt="" />
                  <span className="navbar-profile-name">{profile?.nombre || 'Mi cuenta'}</span>
                </button>
                {profileMenuOpen && (
                  <div className="navbar-profile-dropdown">
                    <NavLink
                      className="navbar-profile-dropdown-link"
                      to="/mi-perfil"
                      onClick={() => { setProfileMenuOpen(false); setMenuOpen(false); }}
                    >
                      Mi perfil
                    </NavLink>
                    <button className="navbar-profile-dropdown-link" onClick={handleSignOut}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <li className="navbar-auth-cta">
                <button type="button" className="btn-amarillo navbar-auth-signup" onClick={() => goToAuth('signup')}>
                  Registrarse
                </button>
                <span className="navbar-auth-o">o</span>
                <button type="button" className="navbar-auth-login" onClick={() => goToAuth('login')}>
                  iniciar sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Navbar;