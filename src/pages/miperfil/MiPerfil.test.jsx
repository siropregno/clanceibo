import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi } from 'vitest';

let mockAuthValue = { session: null, loading: false };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));

import MiPerfil from './MiPerfil';

const ProfileStub = () => {
  const { id } = useParams();
  return <div>Perfil de {id}</div>;
};

const renderMiPerfil = () => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={['/mi-perfil']}>
      <Routes>
        <Route path="/mi-perfil" element={<MiPerfil />} />
        <Route path="/roster/:id" element={<ProfileStub />} />
      </Routes>
    </MemoryRouter>
  </HelmetProvider>
);

describe('MiPerfil', () => {
  it('shows a prompt to log in when there is no session', () => {
    mockAuthValue = { session: null, loading: false };
    renderMiPerfil();
    expect(screen.getByText(/necesitás iniciar sesión/i)).toBeInTheDocument();
  });

  it('redirects to the own profile page when logged in', () => {
    mockAuthValue = { session: { user: { id: 'u1' } }, loading: false };
    renderMiPerfil();
    expect(screen.getByText('Perfil de u1')).toBeInTheDocument();
  });
});
