import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PlayerForm from './playerform';

const baseValues = { id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Fusilero' };

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
    expect(onSubmit).toHaveBeenCalledWith({ id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Fusilero' });
  });

  it('groups checkboxes into their own fieldset, separate from the text fields', () => {
    render(<PlayerForm initialValues={{ ...baseValues, apt_medico: true, apt_tirador: false }}
      fields={['nombre', 'rol_favorito', 'apt_medico', 'apt_tirador']}
      onSubmit={vi.fn()} onCancel={vi.fn()} submitting={false} error={null} />);

    const group = screen.getByRole('group', { name: /aptitudes/i });
    expect(within(group).getByLabelText(/médico especialista/i)).toBeChecked();
    expect(within(group).getByLabelText(/tirador especial/i)).not.toBeChecked();
    // Text inputs must stay out of the checkbox group, otherwise they share
    // its column tracks and the layout breaks.
    expect(within(group).queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    expect(within(group).queryByLabelText(/rol favorito/i)).not.toBeInTheDocument();
  });

  it('renders no checkbox fieldset when no checkbox fields are passed', () => {
    render(<PlayerForm initialValues={baseValues} fields={['nombre', 'rol_favorito']}
      onSubmit={vi.fn()} onCancel={vi.fn()} submitting={false} error={null} />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('still submits checkbox values after the grouping change', async () => {
    const onSubmit = vi.fn();
    render(<PlayerForm initialValues={{ ...baseValues, apt_medico: false }}
      fields={['nombre', 'apt_medico']}
      onSubmit={onSubmit} onCancel={vi.fn()} submitting={false} error={null} />);
    await userEvent.click(screen.getByLabelText(/médico especialista/i));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ id: 'u1', nombre: 'Juan Perez', apt_medico: true });
  });

  it('renders rol_favorito as a dropdown of the fixed role list', async () => {
    const onSubmit = vi.fn();
    render(<PlayerForm initialValues={baseValues} fields={['nombre', 'rol_favorito']}
      onSubmit={onSubmit} onCancel={vi.fn()} submitting={false} error={null} />);
    const select = screen.getByLabelText(/rol favorito/i);
    expect(select.tagName).toBe('SELECT');
    await userEvent.selectOptions(select, 'Sniper');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ id: 'u1', nombre: 'Juan Perez', rol_favorito: 'Sniper' });
  });
});
