import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const mockUpdateEq = vi.fn();
vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: (...a) => mockSingle(...a) }) }),
      update: () => ({ eq: (...a) => mockUpdateEq(...a) }),
    }),
  },
}));

let mockAuthValue = { session: null, loading: false };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import MiPerfil from './MiPerfil';

const renderMiPerfil = () => render(<MemoryRouter><MiPerfil /></MemoryRouter>);

describe('MiPerfil', () => {
  beforeEach(() => { mockSingle.mockReset(); mockUpdateEq.mockReset(); });

  it('shows a prompt to log in when there is no session', () => {
    mockAuthValue = { session: null, loading: false };
    renderMiPerfil();
    expect(screen.getByText(/necesitás iniciar sesión/i)).toBeInTheDocument();
  });

  it('shows the fetched profile, formatted since-date, and badge states when logged in', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, loading: false };
    mockSingle.mockResolvedValue({
      data: { id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', miembro_desde: '2024-03-01',
        apt_tirador: true, apt_medico: false, apt_mortero: false },
      error: null,
    });
    renderMiPerfil();
    await waitFor(() => expect(screen.getByText('Juan Perez')).toBeInTheDocument());
    expect(screen.getByText('Miembro desde marzo 2024')).toBeInTheDocument();
  });

  it('only shows nombre and rol_favorito fields when editing (not miembro_desde or aptitudes)', async () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, loading: false };
    mockSingle.mockResolvedValue({
      data: { id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman', miembro_desde: '2024-03-01',
        apt_tirador: false, apt_medico: false, apt_mortero: false },
      error: null,
    });
    renderMiPerfil();
    await waitFor(() => screen.getByText('Juan Perez'));
    await userEvent.click(screen.getByRole('button', { name: /editar mi perfil/i }));
    expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/miembro desde/i)).not.toBeInTheDocument();
  });
});
