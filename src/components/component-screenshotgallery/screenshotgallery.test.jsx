import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ScreenshotGallery from './screenshotgallery';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const shots = [
  { id: 's1', image_url: 'https://cdn.example.com/1.png', storage_path: 'u1/1.png' },
  { id: 's2', image_url: 'https://cdn.example.com/2.png', storage_path: 'u1/2.png' },
  { id: 's3', image_url: 'https://cdn.example.com/3.png', storage_path: 'u1/3.png' },
];

describe('ScreenshotGallery', () => {
  it('shows an empty message when there are no screenshots', () => {
    render(<ScreenshotGallery screenshots={[]} canManage={false} onDelete={vi.fn()} />);
    expect(screen.getByText(/todavía no hay screenshots/i)).toBeInTheDocument();
  });

  it('renders a thumbnail per screenshot', () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
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

  it('does not show prev/next buttons for a single screenshot', async () => {
    render(<ScreenshotGallery screenshots={[shots[0]]} canManage={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.queryByLabelText(/siguiente/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/anterior/i)).not.toBeInTheDocument();
  });

  it('steps forward through screenshots and loops back to the first', async () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('img')[0]);
    const next = screen.getByLabelText(/siguiente/i);

    await userEvent.click(next);
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[1].image_url);

    await userEvent.click(next);
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[2].image_url);

    await userEvent.click(next);
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[0].image_url);
  });

  it('steps backward through screenshots and loops back to the last', async () => {
    render(<ScreenshotGallery screenshots={shots} canManage={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('img')[0]);
    const prev = screen.getByLabelText(/anterior/i);

    await userEvent.click(prev);
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[2].image_url);

    await userEvent.click(prev);
    expect(document.querySelector('.modal-img')).toHaveAttribute('src', shots[1].image_url);
  });

  it('resets padding on the close/prev/next buttons so the global button padding cannot deform them into pills or collapse the icon', () => {
    // Regression guard: the site-wide `button` rule in main.css sets a text-button
    // padding (12px 28px). These are fixed-size circular icon buttons - without an
    // explicit padding:0 override, that padding widens the box past its declared
    // width (breaking the circle into a pill) and shrinks the icon's content area
    // to 0 (making the arrow/X invisible). See src/main.css `button { padding: ... }`.
    const css = readFileSync(path.join(__dirname, 'screenshotgallery.css'), 'utf8');
    const closeBlock = css.match(/\.modal-close\s*\{[^}]*\}/)[0];
    const navBlock = css.match(/\.modal-nav\s*\{[^}]*\}/)[0];
    expect(closeBlock).toMatch(/padding:\s*0/);
    expect(navBlock).toMatch(/padding:\s*0/);
  });
});
