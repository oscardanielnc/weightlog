import initSqlJs, { type Database } from 'sql.js';
import { escribirArchivo, leerArchivo } from './almacenamiento';
import { aplicarEsquema } from './sqlite/esquema';
import * as q from './sqlite/consultas';

export type { DiaResumen, Registro, Respaldo } from './sqlite/consultas';

/**
 * Fachada de datos de la aplicación.
 *
 * Compone tres piezas: el esquema con migraciones (`sqlite/esquema.ts`), las
 * consultas puras (`sqlite/consultas.ts`) y la persistencia del archivo
 * (`almacenamiento.ts`). Aquí vive el único estado global: la instancia abierta
 * de SQLite y el volcado diferido a IndexedDB.
 */

const RETARDO_GUARDADO_MS = 150;

let base: Database | null = null;
let guardadoPendiente: number | null = null;

/* ---------- notificación de cambios (para useSyncExternalStore) ---------- */

let version = 0;
const escuchas = new Set<() => void>();

/** Suscribe a los cambios de datos y devuelve la función para desuscribirse. */
export function suscribir(escucha: () => void): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
}

/** Instantánea estable: cambia solo cuando algo se escribió. */
export const versionDatos = (): number => version;

function notificar(): void {
  version++;
  for (const escucha of escuchas) escucha();
}

function requerir(): Database {
  if (!base) throw new Error('La base de datos no está iniciada');
  return base;
}

/** Agrupa escrituras seguidas en un solo volcado del archivo y avisa a la interfaz. */
function guardar(): void {
  notificar();
  if (guardadoPendiente !== null) clearTimeout(guardadoPendiente);
  guardadoPendiente = window.setTimeout(() => {
    guardadoPendiente = null;
    if (base) void escribirArchivo(base.export());
  }, RETARDO_GUARDADO_MS);
}

/** Fuerza el volcado inmediato (al ocultar o cerrar la aplicación). */
export async function guardarAhora(): Promise<void> {
  if (guardadoPendiente !== null) {
    clearTimeout(guardadoPendiente);
    guardadoPendiente = null;
  }
  if (base) await escribirArchivo(base.export());
}

export async function iniciarDb(): Promise<void> {
  if (base) return;
  const SQL = await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
  });
  const archivo = await leerArchivo();
  base = archivo ? new SQL.Database(archivo) : new SQL.Database();
  aplicarEsquema(base);
  if (!archivo) await guardarAhora();
}

/* ---------- operaciones (escriben y programan el volcado) ---------- */

export function agregarRegistro(pesoKg: number, ts: number = Date.now()): void {
  q.insertarRegistro(requerir(), pesoKg, ts);
  guardar();
}

export function actualizarRegistro(id: number, pesoKg: number, ts: number): void {
  q.actualizarRegistro(requerir(), id, pesoKg, ts);
  guardar();
}

export function borrarRegistro(id: number): void {
  q.borrarRegistro(requerir(), id);
  guardar();
}

export function borrarTodo(): void {
  q.borrarTodo(requerir());
  guardar();
}

export function escribirConfig(clave: string, valor: string): void {
  q.escribirConfig(requerir(), clave, valor);
  guardar();
}

export function guardarEstatura(metros: number): void {
  q.guardarEstatura(requerir(), metros);
  guardar();
}

export function importarJson(texto: string): { insertados: number; omitidos: number } {
  const resultado = q.importar(requerir(), JSON.parse(texto));
  guardar();
  return resultado;
}

/* ---------- lecturas ---------- */

export const registrosRecientes = (limite = 10) => q.registrosRecientes(requerir(), limite);
export const registrosDelDia = (fecha: string) => q.registrosDelDia(requerir(), fecha);
export const totalRegistros = () => q.totalRegistros(requerir());
export const resumenDiario = () => q.resumenDiario(requerir());
export const leerConfig = (clave: string) => q.leerConfig(requerir(), clave);
export const leerEstatura = () => q.leerEstatura(requerir());
export const exportarJson = () => JSON.stringify(q.exportar(requerir()), null, 2);
