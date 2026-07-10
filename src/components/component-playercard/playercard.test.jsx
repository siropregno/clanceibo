import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlayerCard from './playercard';

const basePlayer = {
  id: '1', nombre: 'Juan Perez', rol_favorito: 'Rifleman',
  apt_tirador: false, apt_medico: false, apt_mortero: false,
};

describe('PlayerCard', () => {
  it('renders nombre and rol_favorito', () => {
    render(<PlayerCard player={basePlayer} onSelect={vi.fn()} />);
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Rifleman')).toBeInTheDocument();
  });

  it('renders badges as not-earned by default', () => {
    render(<PlayerCard player={basePlayer} onSelect={vi.fn()} />);
    expect(screen.getByTitle('Tirador especial')).not.toHaveClass('earned');
  });

  it('renders earned badges with the earned class', () => {
    const earned = { ...basePlayer, apt_tirador: true, apt_medico: true, apt_mortero: true };
    render(<PlayerCard player={earned} onSelect={vi.fn()} />);
    expect(screen.getByTitle('Tirador especial')).toHaveClass('earned');
    expect(screen.getByTitle('Medicina de combate')).toHaveClass('earned');
    expect(screen.getByTitle('Morterista')).toHaveClass('earned');
  });

  it('calls onSelect when the card is clicked', () => {
    const onSelect = vi.fn();
    render(<PlayerCard player={basePlayer} onSelect={onSelect} />);
    screen.getByText('Ver perfil').click();
    expect(onSelect).toHaveBeenCalledWith(basePlayer);
  });
});
