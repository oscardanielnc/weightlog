export type Zona = 'verde' | 'ambar' | 'rojo';

/** Cortes OMS. Verde = normopeso; ámbar = desviación leve; rojo = fuera de rango. */
export const CORTES = { rojoBajo: 17, ambarBajo: 18.5, ambarAlto: 25, rojoAlto: 30 };

export const imc = (pesoKg: number, estaturaM: number) => pesoKg / (estaturaM * estaturaM);

export function zonaDeImc(valor: number): Zona {
  if (valor < CORTES.rojoBajo || valor >= CORTES.rojoAlto) return 'rojo';
  if (valor < CORTES.ambarBajo || valor >= CORTES.ambarAlto) return 'ambar';
  return 'verde';
}

export function etiquetaImc(valor: number): string {
  if (valor < 17) return 'Delgadez marcada';
  if (valor < 18.5) return 'Bajo peso';
  if (valor < 25) return 'Peso normal';
  if (valor < 30) return 'Sobrepeso';
  if (valor < 35) return 'Obesidad I';
  if (valor < 40) return 'Obesidad II';
  return 'Obesidad III';
}

/** Rango de peso en kg correspondiente a un tramo de IMC, para la estatura dada. */
export const pesoParaImc = (valorImc: number, estaturaM: number) => valorImc * estaturaM * estaturaM;

export const rangoIdeal = (estaturaM: number): [number, number] =>
  [pesoParaImc(CORTES.ambarBajo, estaturaM), pesoParaImc(CORTES.ambarAlto, estaturaM)];
