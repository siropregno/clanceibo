import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import PlayerRow from './playerrow';

const basePlayer = {
  id: '1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', avatar_url: null,
  apt_tirador: false, apt_medico: false, apt_game_master: false,
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
    expect(screen.queryByTitle(/^Tirador especial:/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/^Medico especialista:/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/^Game master:/)).not.toBeInTheDocument();
  });

  it('renders only earned badges', () => {
    renderRow({ ...basePlayer, apt_tirador: true, apt_medico: false, apt_game_master: true });
    expect(screen.getByTitle(/^Tirador especial:/)).toBeInTheDocument();
    expect(screen.queryByTitle(/^Medico especialista:/)).not.toBeInTheDocument();
    expect(screen.getByTitle(/^Game master:/)).toBeInTheDocument();
  });

  it('links to the player profile page', () => {
    renderRow(basePlayer);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/roster/1');
  });

  it('shows the aptitude description in the badge tooltip', () => {
    renderRow({ ...basePlayer, apt_tirador: true });
    expect(screen.getByTitle(/Completo desafios de tiro avanzados/)).toBeInTheDocument();
  });
});
