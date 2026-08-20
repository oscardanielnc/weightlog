// Perú (America/Lima) es UTC-5 fijo: no tiene horario de verano desde 1994.
// Por eso basta un desfase constante, sin depender de la zona horaria del celular.
export const LIMA_OFFSET_MIN = -5 * 60;

/** Convierte un instante UTC al "reloj de pared" de Lima. */
function aRelojLima(ts: number): Date {
  return new Date(ts + LIMA_OFFSET_MIN * 60_000);
}

/** 'YYYY-MM-DD' del día en Lima al que pertenece el instante. */
export function fechaLima(ts: number = Date.now()): string {
  return aRelojLima(ts).toISOString().slice(0, 10);
}

/** 'HH:MM:SS' en hora de Lima. */
export function horaLima(ts: number = Date.now()): string {
  return aRelojLima(ts).toISOString().slice(11, 19);
}

/** Instante UTC de la medianoche de Lima de una fecha 'YYYY-MM-DD'. */
export function inicioDiaLima(fecha: string): number {
  return Date.parse(`${fecha}T00:00:00Z`) - LIMA_OFFSET_MIN * 60_000;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const nombreMes = (m: number) => MESES[m];

/** 'miércoles 19 de agosto de 2026' */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dow]} ${d} de ${MESES[m - 1]} de ${a}`;
}

/** 'HH:MM' a partir de 'HH:MM:SS'. */
export const horaCorta = (hora: string) => hora.slice(0, 5);

/** Suma días a una fecha 'YYYY-MM-DD' (aritmética de calendario, sin husos). */
export function sumarDias(fecha: string, dias: number): string {
  const t = Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Días transcurridos entre dos fechas 'YYYY-MM-DD'. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}
