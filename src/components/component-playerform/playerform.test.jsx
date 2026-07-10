import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PlayerForm from './playerform';

const baseValues = { id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman' };

describe('PlayerForm', () => {
  it('blocks submit and shows a validation error when nombre is cleared', async () => {
    const onSubmit = vi.fn();
    render(<PlayerForm initialValues={baseValues} fields={['nombre', 'rol_favorito']}
      onSubmit={onSubmit} onCancel={vi.fn()} submitting={false} error={null} />);
    await userEvent.clear(screen.getByLabelText(/^nombre/i));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/nombre es obligatorio/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('only renders the fields passed in', () => {
    render(<PlayerForm initialValues={baseValues} fields={['nombre', 'rol_favorito']}
      onSubmit={vi.fn()} onCancel={vi.fn()} submitting={false} error={null} />);
    expect(screen.queryByLabelText(/miembro desde/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tirador especial/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with only the rendered fields plus id', async () => {
    const onSubmit = vi.fn();
    render(<PlayerForm initialValues={baseValues} fields={['nombre', 'rol_favorito']}
      onSubmit={onSubmit} onCancel={vi.fn()} submitting={false} error={null} />);
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Rifleman' });
  });
});
