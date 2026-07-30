import { describe, it, expect } from 'vitest';
import { formatFecha, formatRango } from './fechas';

describe('formatFecha', () => {
  it('formats an ISO date in Spanish', () => {
    expect(formatFecha('2026-03-09')).toBe('9 de marzo de 2026');
  });

  it('strips the leading zero from the day', () => {
    expect(formatFecha('2026-12-01')).toBe('1 de diciembre de 2026');
  });

  it('maps the first month correctly', () => {
    expect(formatFecha('2026-01-15')).toBe('15 de enero de 2026');
  });

  it('maps the last month correctly', () => {
    expect(formatFecha('2026-12-31')).toBe('31 de diciembre de 2026');
  });

  // new Date('2026-01-01') parses as UTC midnight, which renders as
  // 31 December of the previous year in any timezone west of Greenwich
  // (Argentina is UTC-3). Splitting the string avoids that entirely.
  it('does not shift the date across a timezone boundary', () => {
    expect(formatFecha('2026-01-01')).toBe('1 de enero de 2026');
  });

  it('returns null for a missing date', () => {
    expect(formatFecha(null)).toBeNull();
    expect(formatFecha('')).toBeNull();
    expect(formatFecha(undefined)).toBeNull();
  });
});

describe('formatRango', () => {
  it('joins both ends when the campaign has a start and an end', () => {
    expect(formatRango('2026-03-01', '2026-04-15')).toBe('1 de marzo de 2026 — 15 de abril de 2026');
  });

  it('reads as open-ended when the campaign is still running', () => {
    expect(formatRango('2026-03-01', null)).toBe('Desde 1 de marzo de 2026');
  });

  it('handles an end date with no start', () => {
    expect(formatRango(null, '2026-04-15')).toBe('Hasta 15 de abril de 2026');
  });

  it('returns null when the campaign has no dates at all', () => {
    expect(formatRango(null, null)).toBeNull();
  });

  it('treats empty strings the same as missing dates', () => {
    expect(formatRango('', '')).toBeNull();
  });

  it('handles a single-day campaign', () => {
    expect(formatRango('2026-03-01', '2026-03-01')).toBe('1 de marzo de 2026 — 1 de marzo de 2026');
  });
});
