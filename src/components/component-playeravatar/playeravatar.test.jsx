import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PlayerAvatar from './playeravatar';

describe('PlayerAvatar', () => {
  it('renders an image when a url is given', () => {
    render(<PlayerAvatar url="https://example.com/avatar.png" size={50} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'Foto de perfil');
    expect(img).toHaveStyle({ width: '50px', height: '50px' });
  });

  it('renders a fallback icon when no url is given', () => {
    render(<PlayerAvatar url={null} />);
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
