import React from 'react';
import './campaignbadge.css';
import Tooltip from '@components/component-tooltip/tooltip';

// One campaign badge, as shown in the "Campañas" block of a player profile.
// Mirrors the aptitude badge treatment (image + label pill) so a profile
// reads as one set of awards, but stays a separate component: campaign
// badges are uploaded artwork with a nullable URL, while aptitude art is
// bundled at build time and always present.
//
// campaign: a campaigns row ({ titulo, descripcion, badge_url }).
const CampaignBadge = ({ campaign }) => {
  const { titulo, descripcion, badge_url } = campaign;
  return (
    <Tooltip text={descripcion || titulo} className="campaign-badge">
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
      <span className="campaign-badge-label">{titulo}</span>
    </Tooltip>
  );
};

export default CampaignBadge;
