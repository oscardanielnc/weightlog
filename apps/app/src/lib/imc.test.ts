import { describe, expect, it } from 'vitest';
import { CORTES, etiquetaImc, imc, pesoParaImc, rangoIdeal, zonaDeImc } from './imc';

const ESTATURA = 1.6;

/** Cortes de la OMS: <17 y ≥30 rojo, 17–18.5 y 25–30 ámbar, 18.5–25 verde. */
describe('IMC y zonas de color', () => {
  it('calcula el IMC', () => {
    expect(imc(60, ESTATURA)).toBeCloseTo(23.44, 2);
  });

  it.each([
    [40, 'rojo'],
    [44, 'ambar'],
    [60, 'verde'],
    [70, 'ambar'],
    [80, 'rojo'],
  ])('clasifica %i kg como %s', (peso, zona) => {
    expect(zonaDeImc(imc(peso, ESTATURA))).toBe(zona);
  });

  it('asigna los bordes al lado correcto', () => {
    expect(zonaDeImc(CORTES.rojoBajo)).toBe('ambar');
    expect(zonaDeImc(CORTES.ambarBajo)).toBe('verde');
    expect(zonaDeImc(CORTES.ambarAlto)).toBe('ambar');
    expect(zonaDeImc(CORTES.rojoAlto)).toBe('rojo');
  });

  it('traduce el rango ideal a kilos', () => {
    const [minimo, maximo] = rangoIdeal(ESTATURA);
    expect(minimo).toBeCloseTo(47.4, 1);
    expect(maximo).toBeCloseTo(64.0, 1);
  });

  it('invierte el cálculo: peso que produce un IMC dado', () => {
    expect(imc(pesoParaImc(22, ESTATURA), ESTATURA)).toBeCloseTo(22, 10);
  });

  it('nombra la categoría', () => {
    expect(etiquetaImc(23.44)).toBe('Peso normal');
  });
});
