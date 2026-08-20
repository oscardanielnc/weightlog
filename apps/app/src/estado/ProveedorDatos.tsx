import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { guardarAhora, guardarEstatura, iniciarDb, leerEstatura } from '../lib/db';
import { ContextoDatos, type EstadoDatos } from './contexto';

/**
 * Abre la base antes de montar la interfaz y comparte la estatura configurada.
 * El resto de los datos se leen bajo demanda con `useConsulta`.
 */
export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estatura, setEstaturaLocal] = useState(1.6);

  useEffect(() => {
    iniciarDb()
      .then(() => {
        setEstaturaLocal(leerEstatura());
        setListo(true);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Android puede matar la aplicación en segundo plano sin previo aviso:
  // al ocultarse se fuerza el volcado del archivo SQLite a IndexedDB.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardarAhora();
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => document.removeEventListener('visibilitychange', alOcultar);
  }, []);

  const valor = useMemo<EstadoDatos>(
    () => ({
      estatura,
      setEstatura: (metros: number) => {
        guardarEstatura(metros);
        setEstaturaLocal(metros);
      },
    }),
    [estatura],
  );

  if (error) {
    return (
      <div className="cargando">
        <p>No se pudo abrir la base de datos.</p>
        <code>{error}</code>
      </div>
    );
  }
  if (!listo) {
    return (
      <div className="cargando">
        <div className="spinner" />
      </div>
    );
  }
  return <ContextoDatos.Provider value={valor}>{children}</ContextoDatos.Provider>;
}
