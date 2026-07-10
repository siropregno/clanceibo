import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './auth.css';
import { supabase } from '@lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const Auth = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => { if (session) navigate('/mi-perfil'); }, [session, navigate]);

  const resetMessages = () => { setError(null); setInfoMessage(null); };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-toggle">
            <button className={mode === 'login' ? 'btn-amarillo' : 'btn-transparente'}
              onClick={() => { setMode('login'); resetMessages(); }}>Iniciar sesión</button>
            <button className={mode === 'signup' ? 'btn-amarillo' : 'btn-transparente'}
              onClick={() => { setMode('signup'); resetMessages(); }}>Registrarse</button>
          </div>

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              <input type="password" placeholder="Contraseña" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              {error && <p role="alert" className="form-error">{error}</p>}
              <button className="btn-amarillo" type="submit" disabled={submitting}>
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <input type="text" placeholder="Nombre" value={nombre}
                onChange={(e) => setNombre(e.target.value)} />
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              <input type="password" placeholder="Contraseña" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <input type="password" placeholder="Confirmar contraseña" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
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
