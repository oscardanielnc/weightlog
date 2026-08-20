import { describe, expect, it } from 'vitest';
import { diasEntre, fechaLarga, fechaLima, horaLima, inicioDiaLima, sumarDias } from './lima';

/**
 * Perú es UTC−5 fijo desde 1994 (sin horario de verano). El día al que pertenece
 * un registro se decide con esa referencia y no con la zona horaria del equipo,
 * por eso los casos importantes son los cruces de medianoche.
 */
describe('fecha y hora de Lima', () => {
  it('asigna al día anterior lo registrado después de las 19:00 UTC', () => {
    const ts = Date.parse('2026-08-20T02:30:00Z'); // 21:30 del 19 en Lima
    expect(fechaLima(ts)).toBe('2026-08-19');
    expect(horaLima(ts)).toBe('21:30:00');
  });

  it('mantiene el día de Lima en la madrugada UTC', () => {
    expect(fechaLima(Date.parse('2026-08-19T04:00:00Z'))).toBe('2026-08-18');
  });

  it('coloca la medianoche de Lima en las 05:00 UTC', () => {
    expect(new Date(inicioDiaLima('2026-08-19')).toISOString()).toBe('2026-08-19T05:00:00.000Z');
  });

  it('va y vuelve entre fecha e instante sin perder el día', () => {
    expect(fechaLima(inicioDiaLima('2026-08-19'))).toBe('2026-08-19');
    expect(fechaLima(inicioDiaLima('2026-08-19') - 1)).toBe('2026-08-18');
  });

  it.each([
    ['2026-08-31', 1, '2026-09-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-03-01', -1, '2026-02-28'],
  ])('suma días cruzando %s', (fecha, dias, esperado) => {
    expect(sumarDias(fecha, dias)).toBe(esperado);
  });

  it('cuenta los días entre dos fechas', () => {
    expect(diasEntre('2026-07-31', '2026-08-19')).toBe(19);
    expect(diasEntre('2026-08-19', '2026-08-19')).toBe(0);
  });

  it('escribe la fecha larga en español', () => {
    expect(fechaLarga('2026-08-19')).toBe('miércoles 19 de agosto de 2026');
  });
});
