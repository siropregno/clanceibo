import React, { useState, useEffect } from 'react';
import './playerform.css';
import { APTITUDES } from '@lib/aptitudes';

export const ROLES = [
  'Fusilero',
  'Ametrallador',
  'Ingeniero',
  'Medico de combate',
  'Tirador designado',
  'Sniper',
  'Piloto de helicoptero',
  'Piloto de combate',
  'Tanquista',
];

const FIELD_CONFIG = {
  nombre: { label: 'Nombre', type: 'text' },
  rol_favorito: { label: 'Rol favorito', type: 'select', options: ROLES },
  miembro_desde: { label: 'Miembro desde', type: 'date' },
  ...Object.fromEntries(APTITUDES.map(({ key, label }) => [key, { label, type: 'checkbox' }])),
};

const buildValues = (source, fields) => {
  const v = { id: source?.id };
  fields.forEach((key) => {
    v[key] = source?.[key] ?? (FIELD_CONFIG[key].type === 'checkbox' ? false : '');
  });
  return v;
};

// initialValues: player row (non-null; there is no create mode).
// fields: array of FIELD_CONFIG keys to render.
// onSubmit(values): values = { id, ...only the rendered fields }
const PlayerForm = ({ initialValues, fields, onSubmit, onCancel, submitting, error }) => {
  const [values, setValues] = useState(buildValues(initialValues, fields));
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    setValues(buildValues(initialValues, fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const handleChange = (field) => (e) => {
    const cfg = FIELD_CONFIG[field];
    const value = cfg.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (fields.includes('nombre') && !String(values.nombre).trim()) {
      setValidationError('El nombre es obligatorio.');
      return;
    }
    setValidationError(null);
    onSubmit(values);
  };

  return (
    <form className="player-form" onSubmit={handleSubmit}>
      {fields.map((key) => {
        const cfg = FIELD_CONFIG[key];
        if (cfg.type === 'checkbox') {
          return (
            <label key={key} className="player-form-checkbox-label">
              <input type="checkbox" checked={values[key]} onChange={handleChange(key)} /> {cfg.label}
            </label>
          );
        }
        if (cfg.type === 'select') {
          return (
            <label key={key}>{cfg.label}
              <select value={values[key]} onChange={handleChange(key)}>
                <option value="">Sin rol favorito</option>
                {cfg.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={key}>{cfg.label}
            <input type={cfg.type} value={values[key]} onChange={handleChange(key)} />
          </label>
        );
      })}
      {(validationError || error) && <p role="alert" className="form-error">{validationError || error}</p>}
      <div className="player-form-actions">
        <button type="submit" className="btn-amarillo" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="btn-blanco" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
};

export default PlayerForm;
