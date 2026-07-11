import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ScreenshotGallery from './screenshotgallery';

const shots = [
  { id: 's1', image_url: 'https://cdn.example.com/1.png', storage_path: 'u1/1.png' },
  { id: 's2', image_url: 'https://cdn.example.com/2.png', storage_path: 'u1/2.png' },
];

describe('ScreenshotGallery', () => {
  it('shows an empty message when there are no screenshots', () => {
    render(<ScreenshotGallery screenshots={[]} canManage={false} onDelete={vi.fn()} />);
    expect(screen.getByText(/todavía no hay screenshots/i)).toBeInTheDocument();
  });

  it('renders a thumbnail per screenshot', () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('does not show delete buttons when canManage is false', () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    expect(screen.queryByLabelText(/eliminar screenshot/i)).not.toBeInTheDocument();
  });

  it('calls onDelete with the screenshot when its delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(<ScreenshotGallery screenshots={shots} canManage onDelete={onDelete} />);
    await userEvent.click(screen.getAllByLabelText(/eliminar screenshot/i)[0]);
    expect(onDelete).toHaveBeenCalledWith(shots[0]);
  });

  it('opens a lightbox with the clicked image when a thumbnail is clicked', async () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('img')[1]);
    expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[1].image_url);
  });

  it('closes the lightbox when the close button is clicked', async () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('img')[0]);
    await userEvent.click(screen.getByLabelText(/cerrar/i));
    expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
  });
});
