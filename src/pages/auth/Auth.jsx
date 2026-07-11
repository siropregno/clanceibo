import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './auth.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import logo from '@assets/images/logo.png';
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Auth = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.state?.mode === 'signup' ? 'signup' : 'login'); // 'login' | 'signup'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => { if (session) navigate('/mi-perfil'); }, [session, navigate]);

  const resetMessages = () => { setError(null); setInfoMessage(null); };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetMessages();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!EMAIL_RE.test(email)) { setError('Ingresá un email válido.'); return; }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) { setError('Email o contraseña incorrectos.'); return; }
    navigate('/mi-perfil');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!nombre.trim()) { setError('Ingresá tu nombre.'); return; }
    if (!EMAIL_RE.test(email)) { setError('Ingresá un email válido.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: nombre.trim() } },
    });
    setSubmitting(false);
    if (signUpError) { setError(signUpError.message); return; }
    if (!data.session) {
      setInfoMessage('¡Cuenta creada! Revisá tu email para confirmar tu cuenta antes de ingresar.');
      return;
    }
    navigate('/mi-perfil');
  };

  return (
    <>
      <Helmet><title>CLAN CEIBO | Ingresar</title></Helmet>
      <div className="auth-page page-container">
        <div className="auth-intro">
          <h1>¡Te damos la bienvenida!</h1>
          <p>Comunidad de Arma 3 - Soft milsim argentino. Iniciá sesión o creá tu cuenta para acceder a tu perfil de jugador.</p>
        </div>
        <div className="auth-card">
          <div className="auth-toggle">
            <button type="button" className={mode === 'signup' ? 'btn-amarillo' : 'btn-transparente'}
              onClick={() => switchMode('signup')}>Registrarse</button>
            <button type="button" className={mode === 'login' ? 'btn-amarillo' : 'btn-transparente'}
              onClick={() => switchMode('login')}>Iniciar sesión</button>
          </div>

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="auth-input-group">
                <FaEnvelope className="auth-input-icon" />
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>
              <div className="auth-input-group has-toggle">
                <FaLock className="auth-input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {error && <p role="alert" className="form-error">{error}</p>}
              <button className="btn-amarillo" type="submit" disabled={submitting}>
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup} noValidate>
              <div className="auth-input-group">
                <FaUser className="auth-input-icon" />
                <input type="text" placeholder="Nombre" value={nombre}
                  onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="auth-input-group">
                <FaEnvelope className="auth-input-icon" />
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>
              <div className="auth-input-group has-toggle">
                <FaLock className="auth-input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="auth-input-group has-toggle">
                <FaLock className="auth-input-icon" />
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirmar contraseña" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {error && <p role="alert" className="form-error">{error}</p>}
              {infoMessage && <p className="form-info">{infoMessage}</p>}
              <button className="btn-amarillo" type="submit" disabled={submitting}>
                {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default Auth;
