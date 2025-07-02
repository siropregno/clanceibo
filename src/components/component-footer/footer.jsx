import React from 'react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa'; // Add this line
import './footer.css';

const Footer = () => {
  return (
    <>
      
      <footer id='footer'>
          
        <div>
          <div className='footer-links'>
            <p>Developed by </p>
            <a href=''>MAS Design</a>
          </div>
          <div className='footer-links'>
            <p>Powered by </p>
            <a href=''>React + Vita</a>
          </div>
        </div>
        <div>
            <p>© 2025 CLAN CEIBO. All rights reserved.</p>
          </div>
        <div className="social-icons">
          <p>Seguinos en:</p>
          <a href='https://www.facebook.com/ClanCeibo' target='_blank' rel='noopener noreferrer'>
            <FaYoutube size={24} />
          </a>
          <a href='https://www.instagram.com/clanceibo' target='_blank' rel='noopener noreferrer'>
            <FaInstagram size={24} />
          </a>
          <a href='https://www.twitter.com/clanceibo' target='_blank' rel='noopener noreferrer'>
            <FaTwitter size={24} />
          </a>
        </div>
      </footer>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", width: "100%", height: "10px" }}>
        <div style={{ height: "100%", backgroundColor: "var(--cel)" }}></div>
        <div style={{ height: "100%", backgroundColor: "var(--wht)" }}></div>
        <div style={{ height: "100%", backgroundColor: "var(--cel)" }}></div>
      </div>
    </>
  );
};

export default Footer;