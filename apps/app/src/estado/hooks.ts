import { useContext, useMemo, useSyncExternalStore } from 'react';
import { suscribir, versionDatos } from '../lib/db';
import { ContextoDatos, type EstadoDatos } from './contexto';

export function useDatos(): EstadoDatos {
  const valor = useContext(ContextoDatos);
  if (!valor) throw new Error('useDatos se usó fuera de <ProveedorDatos>');
  return valor;
}

/** Número de versión de la base; cambia con cada escritura. */
export const useVersionDatos = (): number =>
  useSyncExternalStore(suscribir, versionDatos, versionDatos);

/**
 * Ejecuta una consulta contra SQLite y la vuelve a ejecutar solo cuando la base
 * cambia. Evita el patrón de "contador de refresco" pasado a mano por props:
 * cualquier escritura, venga de donde venga, revalida todas las pantallas.
 *
 *   const dias = useConsulta(resumenDiario);
 */
export function useConsulta<T>(consulta: () => T): T {
  const version = useVersionDatos();
  // La función `consulta` se recrea en cada render, así que no puede ser una
  // dependencia: la única que importa es la versión de la base.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(consulta, [version]);
}
