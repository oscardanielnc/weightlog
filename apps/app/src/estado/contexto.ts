import { createContext } from 'react';

export type EstadoDatos = {
  /** Estatura en metros usada para todos los cálculos de IMC. */
  estatura: number;
  setEstatura: (metros: number) => void;
};

export const ContextoDatos = createContext<EstadoDatos | null>(null);
