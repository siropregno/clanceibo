import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/component-navbar/navbar';
import Footer from './components/component-footer/footer'
import Inicio from './pages/inicio/Inicio';
import About from './pages/about/About';
// import Armory from './pages/armory/Armory'; // Oculto temporalmente
import Orbat from './pages/orbat/orbat';
import Campanas from './pages/campanas/Campanas';
import CampanaDetalle from './pages/campanas/CampanaDetalle';
import Roster from './pages/roster/Roster';
import PlayerProfile from './pages/playerprofile/PlayerProfile';
import Auth from './pages/auth/Auth';
import MiPerfil from './pages/miperfil/MiPerfil';
import Admin from './pages/admin/Admin';
import { ADMIN_PATH } from '@lib/routes';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/about" element={<About />} />
                {/* <Route path="/armory" element={<Armory />} /> */}{/* Oculto temporalmente */}
                <Route path="/orbat" element={<Orbat/>} />
                <Route path="/campanas" element={<Campanas />} />
                <Route path="/campanas/:id" element={<CampanaDetalle />} />
                <Route path="/roster" element={<Roster />} />
                <Route path="/roster/:id" element={<PlayerProfile />} />
                <Route path="/ingresar" element={<Auth />} />
                <Route path="/mi-perfil" element={<MiPerfil />} />
                <Route path={ADMIN_PATH} element={<Admin />} />
              </Routes>
            </main>
            <Footer />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;