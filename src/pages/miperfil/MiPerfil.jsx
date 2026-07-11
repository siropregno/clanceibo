import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './miperfil.css';
import { useAuth } from '../../context/AuthContext';

const MiPerfil = () => {
  const { session, loading: authLoading } = useAuth();

  if (authLoading) return <div className="miperfil-page"><p className="miperfil-status">Cargando...</p></div>;

  if (!session) {
    return (
      <>
        <Helmet><title>CLAN CEIBO | Mi perfil</title></Helmet>
        <div className="miperfil-page">
          <div className="miperfil-container">
            <p>Necesitás iniciar sesión para ver tu perfil.</p>
            <Link to="/ingresar"><button className="btn-amarillo">Iniciar sesión</button></Link>
          </div>
        </div>
      </>
    );
  }

  return <Navigate to={`/roster/${session.user.id}`} replace />;
};

export default MiPerfil;
