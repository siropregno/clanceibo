import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSingle = vi.fn();

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...a) => mockGetSession(...a),
      onAuthStateChange: (...a) => mockOnAuthStateChange(...a),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: (...a) => mockSingle(...a) }) }) }),
  },
}));

import { AuthProvider, useAuth } from './AuthContext';

const Probe = () => {
  const { session, loading, profile, profileLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="session">{session ? session.user.id : 'none'}</span>
      <span data-testid="profile-loading">{String(profileLoading)}</span>
      <span data-testid="profile">{profile ? profile.nombre : 'none'}</span>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSingle.mockReset();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('fetches the profile once a session is present', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockSingle.mockResolvedValue({ data: { id: 'u1', nombre: 'Juan Perez' }, error: null });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('u1');
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Juan Perez'));
  });

  it('leaves profile null when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('profile')).toHaveTextContent('none');
    expect(mockSingle).not.toHaveBeenCalled();
  });
});
