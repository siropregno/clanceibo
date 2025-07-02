import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaTimes } from 'react-icons/fa'; // Add this import
import './photogallery.css';
import img1 from '@assets/images/box/img1.png';
import img2 from '@assets/images/box/img2.png';
import img3 from '@assets/images/box/img3.png';
import img4 from '@assets/images/box/img4.png';
import img5 from '@assets/images/box/img5.png';
import img6 from '@assets/images/box/img6.png';
import img7 from '@assets/images/box/img7.png';
import img9 from '@assets/images/box/img9.png';
import img11 from '@assets/images/box/img11.png';

const images = [
  { src: img1, alt: "Proto 1" },
  { src: img2, alt: "Proto 2" },
  { src: img3, alt: "Proto 3" },
  { src: img4, alt: "Proto 4" },
  { src: img5, alt: "Proto 5" },
  { src: img6, alt: "Proto 6" },
  { src: img7, alt: "Proto 7" },
  { src: img9, alt: "Proto 9" },
  { src: img11, alt: "Proto 11" }
];

const Photogallery = () => {
  const [current, setCurrent] = useState(0);
  const [modalImg, setModalImg] = useState(null); // State for modal image

  const prevImage = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const getVisibleImages = () => {
    const visible = [];
    const numVisible = window.innerWidth < 900 ? 1 : 3; // Show 1 image if width < 900, otherwise 3
    for (let i = 0; i < numVisible; i++) {
      visible.push(images[(current + i) % images.length]);
    }
    return visible;
  };

  const visibleImages = getVisibleImages();

  return (
    <div className="proto-gallery-carousel">
      <div className="proto-gallery-content">
        <button className="carousel-btn" onClick={prevImage}>
        <FaChevronLeft />
      </button>
      <div className="carousel-images">
        {visibleImages.map((img, idx) => (
          <img
            key={idx}
            src={img.src}
            alt={img.alt}
            className="proto-img"
            onClick={() => setModalImg(img)} // Open modal on click
            style={{ cursor: 'pointer' }}
          />
        ))}
      </div>
      <button className="carousel-btn" onClick={nextImage}>
        <FaChevronRight />
      </button>
    </div>

      {/* Modal */}
      {modalImg && (
        <div className="modal-overlay" onClick={() => setModalImg(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalImg(null)}>
              <FaTimes size={24} />
            </button>
            <img src={modalImg.src} alt={modalImg.alt} className="modal-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Photogallery;