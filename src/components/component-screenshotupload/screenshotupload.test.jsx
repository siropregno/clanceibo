import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockInsertSingle = vi.fn();

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...a) => mockUpload(...a),
        getPublicUrl: (...a) => mockGetPublicUrl(...a),
      }),
    },
    from: () => ({ insert: () => ({ select: () => ({ single: (...a) => mockInsertSingle(...a) }) }) }),
  },
}));

import ScreenshotUpload from './screenshotupload';

const makeFile = (name, type, sizeBytes) => new File([new Uint8Array(sizeBytes)], name, { type });

describe('ScreenshotUpload', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();
    mockInsertSingle.mockReset();
  });

  it('rejects a disallowed file type without uploading', async () => {
    render(<ScreenshotUpload userId="u1" onUploaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [makeFile('doc.pdf', 'application/pdf', 100)] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/formato no válido/i));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit without uploading', async () => {
    render(<ScreenshotUpload userId="u1" onUploaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]');
    const file = makeFile('big.png', 'image/png', 6 * 1024 * 1024);
    await userEvent.upload(input, file);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/hasta 5mb/i));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads each valid file and calls onUploaded per file', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/shot.png' } });
    mockInsertSingle.mockResolvedValue({ data: { id: 's1', image_url: 'https://cdn.example.com/shot.png' }, error: null });
    const onUploaded = vi.fn();
    render(<ScreenshotUpload userId="u1" onUploaded={onUploaded} />);
    const input = document.querySelector('input[type="file"]');
    const file1 = makeFile('a.png', 'image/png', 100);
    const file2 = makeFile('b.png', 'image/png', 100);
    await userEvent.upload(input, [file1, file2]);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2));
  });
});
