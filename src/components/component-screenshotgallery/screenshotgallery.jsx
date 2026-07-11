import React, { useState } from 'react';
import './screenshotgallery.css';
import { FaTimes, FaChevronLeft, FaChevronRight, FaTrash } from 'react-icons/fa';

// screenshots: array of { id, image_url, storage_path }
// canManage: whether to show per-screenshot delete buttons (the profile owner)
// onDelete(screenshot): called when a delete button is clicked
const ScreenshotGallery = ({ screenshots, canManage, onDelete }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const close = () => setOpenIndex(null);
  const showPrev = (e) => { e.stopPropagation(); setOpenIndex((i) => (i === 0 ? screenshots.length - 1 : i - 1)); };
  const showNext = (e) => { e.stopPropagation(); setOpenIndex((i) => (i === screenshots.length - 1 ? 0 : i + 1)); };

  if (screenshots.length === 0) {
    return <p className="screenshot-gallery-empty">Todavía no hay screenshots.</p>;
  }

  return (
    <>
      <div className="screenshot-gallery-grid">
        {screenshots.map((shot, index) => (
          <div key={shot.id} className="screenshot-thumb" onClick={() => setOpenIndex(index)}>
            <img src={shot.image_url} alt="Screenshot" />
            {canManage && (
              <button
                type="button"
                className="screenshot-thumb-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(shot); }}
                aria-label="Eliminar screenshot"
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={close} aria-label="Cerrar">
              <FaTimes size={20} />
            </button>
            {screenshots.length > 1 && (
              <button className="modal-nav modal-nav-prev" onClick={showPrev} aria-label="Anterior">
                <FaChevronLeft size={20} />
              </button>
            )}
            <img src={screenshots[openIndex].image_url} alt="Screenshot" className="modal-img" />
            {screenshots.length > 1 && (
              <button className="modal-nav modal-nav-next" onClick={showNext} aria-label="Siguiente">
                <FaChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotGallery;
