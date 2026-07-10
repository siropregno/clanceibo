import React, { useState } from 'react';
import { supabase } from '@lib/supabaseClient';

const AdminLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError('Email o contraseña incorrectos.');
  };

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <h2>Ingresar</h2>
      <input type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <input type="password" placeholder="Contraseña" value={password}
        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="btn-amarillo" type="submit" disabled={submitting}>
        {submitting ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
};

export default AdminLoginForm;
