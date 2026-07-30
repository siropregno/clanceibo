import React from 'react';
import './campaignbadge.css';
import Tooltip from '@components/component-tooltip/tooltip';

// One campaign badge, as shown in the "Campañas" block of a player profile.
// Artwork only: the campaign name lives in the tooltip rather than a label
// beside it, so a player with several campaigns reads as a row of medals
// instead of a stack of text pills.
//
// The badge links to its campaign and opens in a new tab, so following one
// does not lose the profile the visitor was reading.
//
// rel="noreferrer" is required with target="_blank": without it the opened
// page gets a window.opener handle back to this one.
//
// campaign: a campaigns row ({ id, titulo, badge_url }).
const CampaignBadge = ({ campaign }) => {
  const { id, titulo, badge_url } = campaign;
  return (
    <Tooltip text={titulo} className="campaign-badge">
      <a
        className="campaign-badge-link"
        href={`/campanas/${id}`}
        target="_blank"
        rel="noreferrer"
        aria-label={titulo}
      >
        {badge_url ? (
          <img src={badge_url} alt="" className="campaign-badge-img" />
        ) : (
          // A campaign can be created before its artwork exists. Falling back
          // to the first letter keeps the row from collapsing and avoids a
          // broken-image icon.
          <span className="campaign-badge-fallback" aria-hidden="true">
            {titulo.charAt(0).toUpperCase()}
          </span>
        )}
      </a>
    </Tooltip>
  );
};

export default CampaignBadge;
