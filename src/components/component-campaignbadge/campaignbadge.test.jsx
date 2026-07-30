import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import CampaignBadge from './campaignbadge';

const campaign = (over = {}) => ({
  id: 'c1', titulo: 'Tormenta del Sur', badge_url: 'https://cdn.test/badge.png', ...over,
});

describe('CampaignBadge', () => {
  it('renders the campaign artwork when there is one', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(document.querySelector('.campaign-badge-img'))
      .toHaveAttribute('src', 'https://cdn.test/badge.png');
  });

  // A campaign can be created before its artwork is uploaded. Without the
  // fallback the row renders a broken-image icon and loses its height.
  it('falls back to the first letter when the campaign has no badge', () => {
    render(<CampaignBadge campaign={campaign({ titulo: 'Relámpago', badge_url: null })} />);
    expect(document.querySelector('.campaign-badge-img')).toBeNull();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('uppercases the fallback letter for a lowercase title', () => {
    render(<CampaignBadge campaign={campaign({ titulo: 'operación silenciosa', badge_url: null })} />);
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  // The name lives in the tooltip now, not in a label beside the artwork.
  it('does not render the title as visible text', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(screen.queryByText('Tormenta del Sur')).toBeNull();
  });

  it('shows the campaign name in a tooltip on hover', async () => {
    render(<CampaignBadge campaign={campaign()} />);
    await userEvent.hover(screen.getByRole('link'));
    expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument();
  });

  it('hides the tooltip again on unhover', async () => {
    render(<CampaignBadge campaign={campaign()} />);
    const link = screen.getByRole('link');
    await userEvent.hover(link);
    expect(screen.getByText('Tormenta del Sur')).toBeInTheDocument();
    await userEvent.unhover(link);
    expect(screen.queryByText('Tormenta del Sur')).toBeNull();
  });

  it('links to its campaign', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/campanas/c1');
  });

  it('opens the campaign in a new tab', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  // Without rel=noreferrer the opened page gets a window.opener handle back
  // to this one, which is a security hole, not a style preference.
  it('does not hand the opened tab a window.opener reference', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(screen.getByRole('link')).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  // The artwork is decorative (alt=""), so the link needs its own accessible
  // name or a screen reader announces an unlabelled link.
  it('gives the link an accessible name', () => {
    render(<CampaignBadge campaign={campaign()} />);
    expect(screen.getByRole('link', { name: 'Tormenta del Sur' })).toBeInTheDocument();
  });

  it('names the link even when the campaign has no artwork', () => {
    render(<CampaignBadge campaign={campaign({ badge_url: null })} />);
    expect(screen.getByRole('link', { name: 'Tormenta del Sur' })).toBeInTheDocument();
  });
});
