import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...a) => mockUpload(...a),
        getPublicUrl: (...a) => mockGetPublicUrl(...a),
      }),
    },
    from: () => ({ update: () => ({ eq: (...a) => mockUpdateEq(...a) }) }),
  },
}));

import AvatarUploader from './avatarupload';

const makeFile = (name, type, sizeBytes) => {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
};

describe('AvatarUploader', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();
    mockUpdateEq.mockReset();
  });

  it('exposes an accessible label for the camera upload badge', () => {
    render(<AvatarUploader userId="u1" currentUrl={null} onUploaded={vi.fn()} />);
    expect(screen.getByLabelText(/cambiar foto de perfil/i)).toBeInTheDocument();
  });

  it('rejects a disallowed file type without uploading', async () => {
    // userEvent.upload mimics the browser's native accept-attribute file
    // picker filtering, so a mismatched file never reaches onChange via it.
    // fireEvent.change bypasses that to exercise the app's own runtime
    // guard, which still matters since accept is bypassable (e.g. drag and
    // drop from outside the OS file picker).
    render(<AvatarUploader userId="u1" currentUrl={null} onUploaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]');
    const file = makeFile('doc.pdf', 'application/pdf', 100);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/formato no válido/i));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit without uploading', async () => {
    render(<AvatarUploader userId="u1" currentUrl={null} onUploaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]');
    const file = makeFile('big.png', 'image/png', 3 * 1024 * 1024);
    await userEvent.upload(input, file);
    expect(screen.getByRole('alert')).toHaveTextContent(/no puede superar los 2mb/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads a valid file and calls onUploaded with the public url', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/u1/avatar.png' } });
    mockUpdateEq.mockResolvedValue({ error: null });
    const onUploaded = vi.fn();
    render(<AvatarUploader userId="u1" currentUrl={null} onUploaded={onUploaded} />);
    const input = document.querySelector('input[type="file"]');
    const file = makeFile('me.png', 'image/png', 1000);
    await userEvent.upload(input, file);
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(onUploaded.mock.calls[0][0]).toContain('https://cdn.example.com/u1/avatar.png');
  });
});
