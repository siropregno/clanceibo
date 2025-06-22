import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaTimes } from 'react-icons/fa'; // Add this import
import './photogallery.css';

const images = [
  { src: "src/assets/images/box/img1.png", alt: "Proto 1" },
  { src: "src/assets/images/box/img2.png", alt: "Proto 2" },
  { src: "src/assets/images/box/img3.png", alt: "Proto 3" },
  { src: "src/assets/images/box/img4.png", alt: "Proto 4" },
  { src: "src/assets/images/box/img5.png", alt: "Proto 5" },
  { src: "src/assets/images/box/img6.png", alt: "Proto 6" },
  { src: "src/assets/images/box/img7.png", alt: "Proto 7" },
  { src: "src/assets/images/box/img9.png", alt: "Proto 9" },
  { src: "src/assets/images/box/img11.png", alt: "Proto 11" }
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
    for (let i = 0; i < 3; i++) {
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