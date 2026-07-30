const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Dates come out of Postgres as plain 'yyyy-mm-dd' strings. Splitting the
// string beats new Date(str): the Date constructor parses a bare date as UTC
// midnight and then renders it in local time, so anywhere west of Greenwich
// (Argentina included) a date renders as the previous day.
export const formatFecha = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day, 10)} de ${MESES[parseInt(month, 10) - 1]} de ${year}`;
};

// A campaign's date span. Both ends are nullable: a campaign can be running
// with no end date yet, or have neither date set.
export const formatRango = (inicio, fin) => {
  if (!inicio && !fin) return null;
  if (inicio && !fin) return `Desde ${formatFecha(inicio)}`;
  if (!inicio && fin) return `Hasta ${formatFecha(fin)}`;
  return `${formatFecha(inicio)} — ${formatFecha(fin)}`;
};
