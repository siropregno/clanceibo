import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/component-navbar/navbar';
import Footer from './components/component-footer/footer'
import Inicio from './pages/inicio/Inicio';
import About from './pages/about/About';
import Armory from './pages/armory/Armory';
import Orbat from './pages/orbat/Orbat';

function App() {
  return (
    <Router>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/about" element={<About />} />
            <Route path="/armory" element={<Armory />} />
            <Route path="/orbat" element={<Orbat/>} />
          </Routes>
        </main>
        <Footer />
    </Router>
  );
}

export default App;