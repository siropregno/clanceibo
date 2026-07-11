import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import PlayerRow from './playerrow';

const basePlayer = {
  id: '1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', avatar_url: null,
  apt_tirador: false, apt_medico: false, apt_mortero: false,
};

const renderRow = (player) => render(<MemoryRouter><PlayerRow player={player} /></MemoryRouter>);

describe('PlayerRow', () => {
  it('renders nombre and rol_favorito', () => {
    renderRow(basePlayer);
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Rifleman')).toBeInTheDocument();
  });

  it('renders no badges when none are earned', () => {
    renderRow(basePlayer);
    expect(screen.queryByTitle('Tirador especial')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Medicina de combate')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Morterista')).not.toBeInTheDocument();
  });

  it('renders only earned badges', () => {
    renderRow({ ...basePlayer, apt_tirador: true, apt_medico: false, apt_mortero: true });
    expect(screen.getByTitle('Tirador especial')).toHaveClass('earned');
    expect(screen.queryByTitle('Medicina de combate')).not.toBeInTheDocument();
    expect(screen.getByTitle('Morterista')).toHaveClass('earned');
  });

  it('links to the player profile page', () => {
    renderRow(basePlayer);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/roster/1');
  });
});
