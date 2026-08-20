import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs, { type Database } from 'sql.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { inicioDiaLima } from '../lima';
import { aplicarEsquema, VERSION_ESQUEMA } from './esquema';
import * as q from './consultas';

/**
 * Pruebas de integración contra un SQLite real (sql.js compilado a WebAssembly)
 * en memoria: el mismo motor que corre en el teléfono, sin navegador de por medio.
 */
const wasm = new Uint8Array(
  readFileSync(createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')),
).buffer;
const SQL = await initSqlJs({ wasmBinary: wasm });

const alas = (fecha: string, hora: number, minuto = 0) =>
  inicioDiaLima(fecha) + (hora * 60 + minuto) * 60_000;

let base: Database;

beforeEach(() => {
  base = new SQL.Database();
  aplicarEsquema(base);
});

describe('esquema', () => {
  it('deja registrada la versión y es idempotente', () => {
    expect(aplicarEsquema(base)).toBe(VERSION_ESQUEMA);
    expect(base.exec('PRAGMA user_version')[0].values[0][0]).toBe(VERSION_ESQUEMA);
    expect(q.leerEstatura(base)).toBe(1.6);
  });

  it('rechaza pesos no positivos', () => {
    expect(() => q.insertarRegistro(base, 0, Date.now())).toThrow();
  });
});

describe('registros', () => {
  it('guarda la fecha y la hora de Lima derivadas del instante UTC', () => {
    const id = q.insertarRegistro(base, 62.4, Date.parse('2026-08-20T02:30:00Z'));
    const [fila] = q.registrosDelDia(base, '2026-08-19');
    expect(fila.id).toBe(id);
    expect(fila.hora_lima).toBe('21:30:00');
    expect(fila.peso_kg).toBe(62.4);
  });

  it('actualiza y borra', () => {
    const id = q.insertarRegistro(base, 60, alas('2026-08-19', 7));
    q.actualizarRegistro(base, id, 61.5, alas('2026-08-19', 8));
    expect(q.registrosDelDia(base, '2026-08-19')[0]).toMatchObject({
      peso_kg: 61.5,
      hora_lima: '08:00:00',
    });
    q.borrarRegistro(base, id);
    expect(q.totalRegistros(base)).toBe(0);
  });

  it('devuelve los recientes del más nuevo al más viejo', () => {
    q.insertarRegistro(base, 60, alas('2026-08-17', 7));
    q.insertarRegistro(base, 61, alas('2026-08-18', 7));
    q.insertarRegistro(base, 62, alas('2026-08-19', 7));
    expect(q.registrosRecientes(base, 2).map((r) => r.peso_kg)).toEqual([62, 61]);
  });
});

describe('resumen diario', () => {
  it('promedia las pesadas del mismo día de Lima', () => {
    q.insertarRegistro(base, 60, alas('2026-08-19', 7));
    q.insertarRegistro(base, 62, alas('2026-08-19', 21)); // 02:00 UTC del día 20
    q.insertarRegistro(base, 64, alas('2026-08-20', 7));

    expect(q.resumenDiario(base)).toEqual([
      { fecha: '2026-08-19', promedio: 61, conteo: 2, min: 60, max: 62 },
      { fecha: '2026-08-20', promedio: 64, conteo: 1, min: 64, max: 64 },
    ]);
  });
});

describe('respaldo', () => {
  it('reimportar no duplica y sí repone lo faltante', () => {
    q.insertarRegistro(base, 60, alas('2026-08-19', 7));
    q.guardarEstatura(base, 1.75);
    const respaldo = q.exportar(base);

    expect(q.importar(base, respaldo)).toEqual({ insertados: 0, omitidos: 1 });

    const vacia = new SQL.Database();
    aplicarEsquema(vacia);
    expect(q.importar(vacia, respaldo)).toEqual({ insertados: 1, omitidos: 0 });
    expect(q.leerEstatura(vacia)).toBe(1.75);
  });

  it('descarta filas corruptas sin abortar la importación', () => {
    const resultado = q.importar(base, {
      registros: [
        { ts_utc: alas('2026-08-19', 7), peso_kg: 60 },
        { ts_utc: 'ayer', peso_kg: 60 },
        { ts_utc: alas('2026-08-19', 8), peso_kg: -3 },
      ],
    });
    expect(resultado).toEqual({ insertados: 1, omitidos: 2 });
    expect(q.totalRegistros(base)).toBe(1);
  });

  it('ignora una estatura fuera de rango', () => {
    q.importar(base, { registros: [], config: [{ clave: 'estatura_m', valor: '9.99' }] });
    expect(q.leerEstatura(base)).toBe(1.6);
  });

  it('falla si el archivo no tiene registros', () => {
    expect(() => q.importar(base, { hola: 'mundo' })).toThrow(/no contiene registros/);
  });
});
