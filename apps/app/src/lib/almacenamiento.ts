/**
 * Persistencia del archivo SQLite en IndexedDB.
 * Es el único punto del código que toca almacenamiento del navegador.
 */
const NOMBRE_IDB = 'peso-app';
const ALMACEN = 'sqlite';
const CLAVE = 'db';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(NOMBRE_IDB, 1);
    solicitud.onupgradeneeded = () => solicitud.result.createObjectStore(ALMACEN);
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

export async function leerArchivo(): Promise<Uint8Array | null> {
  const idb = await abrir();
  try {
    return await new Promise<Uint8Array | null>((resolver, rechazar) => {
      const solicitud = idb.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(CLAVE);
      solicitud.onsuccess = () => resolver((solicitud.result as Uint8Array) ?? null);
      solicitud.onerror = () => rechazar(solicitud.error);
    });
  } finally {
    idb.close();
  }
}

export async function escribirArchivo(datos: Uint8Array): Promise<void> {
  const idb = await abrir();
  try {
    await new Promise<void>((resolver, rechazar) => {
      const tx = idb.transaction(ALMACEN, 'readwrite');
      tx.objectStore(ALMACEN).put(datos, CLAVE);
      tx.oncomplete = () => resolver();
      tx.onerror = () => rechazar(tx.error);
    });
  } finally {
    idb.close();
  }
}
