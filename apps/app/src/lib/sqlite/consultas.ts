import type { Database } from 'sql.js';
import { fechaLima, horaLima } from '../lima';
import { ESTATURA_POR_DEFECTO } from './esquema';

export type Registro = {
  id: number;
  ts_utc: number;
  fecha_lima: string;
  hora_lima: string;
  peso_kg: number;
};

export type DiaResumen = {
  fecha: string;
  promedio: number;
  conteo: number;
  min: number;
  max: number;
};

export type Respaldo = {
  version: number;
  exportado_en: string;
  config: { clave: string; valor: string }[];
  registros: Registro[];
};

/**
 * Capa de consultas: funciones puras sobre una `Database` de sql.js.
 * No conoce IndexedDB ni React, así que se puede probar en Node contra
 * un SQLite en memoria (ver `consultas.test.ts`).
 */

function filas<T>(base: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = base.prepare(sql);
  try {
    stmt.bind(params as never);
    const salida: T[] = [];
    while (stmt.step()) salida.push(stmt.getAsObject() as T);
    return salida;
  } finally {
    stmt.free();
  }
}

/* ---------- registros ---------- */

export function insertarRegistro(base: Database, pesoKg: number, ts: number): number {
  base.run('INSERT INTO registros (ts_utc, fecha_lima, hora_lima, peso_kg) VALUES (?, ?, ?, ?)', [
    ts,
    fechaLima(ts),
    horaLima(ts),
    pesoKg,
  ]);
  return filas<{ id: number }>(base, 'SELECT last_insert_rowid() AS id')[0].id;
}

export function actualizarRegistro(base: Database, id: number, pesoKg: number, ts: number): void {
  base.run(
    'UPDATE registros SET peso_kg = ?, ts_utc = ?, fecha_lima = ?, hora_lima = ? WHERE id = ?',
    [pesoKg, ts, fechaLima(ts), horaLima(ts), id],
  );
}

export function borrarRegistro(base: Database, id: number): void {
  base.run('DELETE FROM registros WHERE id = ?', [id]);
}

export function borrarTodo(base: Database): void {
  base.run('DELETE FROM registros');
}

export const registrosRecientes = (base: Database, limite = 10): Registro[] =>
  filas<Registro>(base, 'SELECT * FROM registros ORDER BY ts_utc DESC, id DESC LIMIT ?', [limite]);

export const registrosDelDia = (base: Database, fecha: string): Registro[] =>
  filas<Registro>(base, 'SELECT * FROM registros WHERE fecha_lima = ? ORDER BY ts_utc ASC', [fecha]);

export const totalRegistros = (base: Database): number =>
  filas<{ n: number }>(base, 'SELECT COUNT(*) AS n FROM registros')[0]?.n ?? 0;

/** Promedio aritmético por día de Lima, en orden cronológico. */
export const resumenDiario = (base: Database): DiaResumen[] =>
  filas<DiaResumen>(
    base,
    `SELECT fecha_lima AS fecha,
            AVG(peso_kg) AS promedio,
            COUNT(*)     AS conteo,
            MIN(peso_kg) AS min,
            MAX(peso_kg) AS max
       FROM registros
      GROUP BY fecha_lima
      ORDER BY fecha_lima ASC`,
  );

/* ---------- configuración ---------- */

export const leerConfig = (base: Database, clave: string): string | null =>
  filas<{ valor: string }>(base, 'SELECT valor FROM config WHERE clave = ?', [clave])[0]?.valor ??
  null;

export function escribirConfig(base: Database, clave: string, valor: string): void {
  base.run(
    'INSERT INTO config(clave, valor) VALUES (?, ?) ' +
      'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor],
  );
}

export function leerEstatura(base: Database): number {
  const valor = Number(leerConfig(base, 'estatura_m'));
  return Number.isFinite(valor) && valor > 0 ? valor : ESTATURA_POR_DEFECTO;
}

export function guardarEstatura(base: Database, metros: number): void {
  escribirConfig(base, 'estatura_m', metros.toFixed(2));
}

/* ---------- respaldo ---------- */

export const exportar = (base: Database): Respaldo => ({
  version: 1,
  exportado_en: new Date().toISOString(),
  config: filas<{ clave: string; valor: string }>(base, 'SELECT * FROM config ORDER BY clave'),
  registros: filas<Registro>(base, 'SELECT * FROM registros ORDER BY ts_utc ASC'),
});

/**
 * Importa un respaldo dentro de una transacción. Omite los registros que ya
 * existen (mismo instante y mismo peso) para que reimportar sea seguro.
 */
export function importar(
  base: Database,
  datos: unknown,
): { insertados: number; omitidos: number } {
  const cuerpo = datos as Partial<Respaldo>;
  if (!Array.isArray(cuerpo?.registros)) throw new Error('El archivo no contiene registros');

  let insertados = 0;
  let omitidos = 0;
  base.run('BEGIN');
  try {
    for (const r of cuerpo.registros) {
      const ts = Number(r?.ts_utc);
      const peso = Number(r?.peso_kg);
      if (!Number.isFinite(ts) || !Number.isFinite(peso) || peso <= 0) {
        omitidos++;
        continue;
      }
      const repetido =
        filas<{ n: number }>(
          base,
          'SELECT COUNT(*) AS n FROM registros WHERE ts_utc = ? AND peso_kg = ?',
          [ts, peso],
        )[0].n > 0;
      if (repetido) {
        omitidos++;
        continue;
      }
      insertarRegistro(base, peso, ts);
      insertados++;
    }
    for (const c of cuerpo.config ?? []) {
      if (c?.clave === 'estatura_m') {
        const metros = Number(c.valor);
        if (Number.isFinite(metros) && metros >= 1 && metros <= 2.5) guardarEstatura(base, metros);
      }
    }
    base.run('COMMIT');
  } catch (e) {
    base.run('ROLLBACK');
    throw e;
  }
  return { insertados, omitidos };
}
