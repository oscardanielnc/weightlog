import type { Database } from 'sql.js';

/**
 * Versión del esquema. Cada incremento agrega una función de migración en
 * `MIGRACIONES`; `aplicarEsquema` las ejecuta en orden usando `PRAGMA user_version`,
 * que SQLite guarda dentro del propio archivo de la base.
 */
export const VERSION_ESQUEMA = 1;

export const ESTATURA_POR_DEFECTO = 1.6;

const MIGRACIONES: ((base: Database) => void)[] = [
  // v0 -> v1: esquema inicial.
  (base) => {
    base.run(`
      CREATE TABLE IF NOT EXISTS registros (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ts_utc     INTEGER NOT NULL,
        fecha_lima TEXT    NOT NULL,
        hora_lima  TEXT    NOT NULL,
        peso_kg    REAL    NOT NULL CHECK (peso_kg > 0)
      );
      CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros(fecha_lima);
      CREATE INDEX IF NOT EXISTS idx_registros_ts    ON registros(ts_utc);

      CREATE TABLE IF NOT EXISTS config (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);
    base.run('INSERT OR IGNORE INTO config(clave, valor) VALUES (?, ?)', [
      'estatura_m',
      ESTATURA_POR_DEFECTO.toFixed(2),
    ]);
  },
];

function versionActual(base: Database): number {
  const filas = base.exec('PRAGMA user_version');
  return Number(filas[0]?.values[0]?.[0] ?? 0);
}

/** Lleva la base al último esquema conocido. Es idempotente. */
export function aplicarEsquema(base: Database): number {
  const desde = versionActual(base);
  for (let v = desde; v < VERSION_ESQUEMA; v++) MIGRACIONES[v](base);
  if (desde < VERSION_ESQUEMA) base.run(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
  return VERSION_ESQUEMA;
}
