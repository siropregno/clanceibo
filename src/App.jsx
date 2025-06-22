import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import Navbar from './components/component-navbar/navbar';
import Footer from './components/component-footer/footer'
import Inicio from './pages/inicio/Inicio';
import About from './pages/about/About';
import Armory from './pages/armory/Armory';

function App() {
  return (
    <BrowserRouter basename="/clanceibo">
      <>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/Home" replace />} />
            <Route path="/Home" element={<Inicio />} />
            <Route path="/about" element={<About />} />
            <Route path="/armory" element={<Armory />} />
          </Routes>
        </main>
        <Footer />
      </>
    </BrowserRouter>
  );
}

export default App;