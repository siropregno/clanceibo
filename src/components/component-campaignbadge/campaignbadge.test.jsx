import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CampaignBadge from './campaignbadge';

describe('CampaignBadge', () => {
  it('renders the campaign artwork when there is one', () => {
    render(<CampaignBadge campaign={{
      id: 'c1', titulo: 'Tormenta del Sur', descripcion: 'Seis noches en Altis.',
      badge_url: 'https://cdn.test/badge.png',
    }} />);
    const img = document.querySelector('.campaign-badge-img');
    expect(img).toHaveAttribute('src', 'https://cdn.test/badge.png');
    expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument();
  });

  // A campaign can be created before its artwork is uploaded. Without the
  // fallback the row renders a broken-image icon and loses its height.
  it('falls back to the first letter when the campaign has no badge', () => {
    render(<CampaignBadge campaign={{ id: 'c1', titulo: 'Relámpago', badge_url: null }} />);
    expect(document.querySelector('.campaign-badge-img')).toBeNull();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('uppercases the fallback letter for a lowercase title', () => {
    render(<CampaignBadge campaign={{ id: 'c1', titulo: 'operación silenciosa', badge_url: null }} />);
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  // The artwork is decorative: the title is already rendered as text beside
  // it, so an alt copy would make a screen reader announce it twice.
  it('leaves the artwork out of the accessibility tree', () => {
    render(<CampaignBadge campaign={{ id: 'c1', titulo: 'Tormenta', badge_url: 'https://cdn.test/b.png' }} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('always shows the title', () => {
    render(<CampaignBadge campaign={{ id: 'c1', titulo: 'Tormenta', badge_url: null }} />);
    expect(screen.getByText('Tormenta')).toBeInTheDocument();
  });
});
