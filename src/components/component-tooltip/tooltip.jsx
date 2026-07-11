import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

const HALF_WIDTH = 110; // half of the CSS max-width (220px)
const EDGE_MARGIN = 8;

// Portal-based tooltip: renders into document.body as position:fixed,
// positioned from the trigger's live bounding rect. Escapes any ancestor's
// overflow:hidden/clipping (e.g. the rounded-corner roster list card) -
// something a pure CSS ::after tooltip anchored inside that container
// cannot do.
const Tooltip = ({ text, children, className }) => {
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  const show = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(centerX, HALF_WIDTH + EDGE_MARGIN),
      window.innerWidth - HALF_WIDTH - EDGE_MARGIN
    );
    setCoords({ top: rect.top, left });
  };

  const hide = () => setCoords(null);

  return (
    <span
      ref={triggerRef}
      className={className ? `tooltip-trigger ${className}` : 'tooltip-trigger'}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords && createPortal(
        <span className="tooltip-bubble" style={{ top: coords.top, left: coords.left }}>
          {text}
        </span>,
        document.body
      )}
    </span>
  );
};

export default Tooltip;
