# Arquitectura

Mi Peso es una aplicación de un solo usuario, sin servidor y sin red. Todo el diseño sale de esa
restricción: la base de datos vive dentro del dispositivo y la aplicación tiene que ser correcta sin
poder apoyarse en ningún servicio externo.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Interfaz (React 19)                                                 │
│  screens/Registro · Calendario · Progreso · Ajustes                  │
└───────────────┬──────────────────────────────────────────────────────┘
                │ useDatos() · useConsulta()
┌───────────────▼──────────────────────────────────────────────────────┐
│  Estado (src/estado)                                                 │
│  ProveedorDatos: abre la base, comparte la estatura                  │
│  hooks: useSyncExternalStore sobre la versión de la base             │
└───────────────┬──────────────────────────────────────────────────────┘
                │ API de la fachada
┌───────────────▼──────────────────────────────────────────────────────┐
│  Datos (src/lib)                                                     │
│  db.ts            fachada: instancia única + volcado diferido        │
│  sqlite/esquema   tablas y migraciones por PRAGMA user_version       │
│  sqlite/consultas funciones puras sobre una Database (probables)     │
│  almacenamiento   IndexedDB: leer y escribir el archivo SQLite       │
│  lima.ts / imc.ts dominio puro: fechas de Perú y zonas de IMC        │
└──────────────────────────────────────────────────────────────────────┘
```

## Capas

### Dominio puro — `lib/lima.ts`, `lib/imc.ts`

Sin dependencias y sin efectos: dado un instante devuelven la fecha de Lima; dado un peso y una
estatura, el IMC y su zona de color. Son las funciones más probadas del proyecto porque de ellas
depende a qué día pertenece cada registro y de qué color se pinta.

### Consultas — `lib/sqlite/consultas.ts`

Cada consulta es una función que recibe una `Database` de sql.js. No conoce React, IndexedDB ni
ningún estado global, así que las mismas funciones que corren en el teléfono se prueban en Node
contra un SQLite en memoria (`consultas.test.ts`).

### Esquema — `lib/sqlite/esquema.ts`

Las migraciones son un arreglo de funciones y la versión aplicada se guarda en el propio archivo con
`PRAGMA user_version`. Agregar una columna en el futuro es añadir una función al arreglo: los
teléfonos que ya tienen datos migran solos al abrir la aplicación.

### Fachada — `lib/db.ts`

El único estado global del proyecto: la instancia abierta de SQLite y el volcado a IndexedDB.
Concentra tres responsabilidades que el resto del código no debería ver:

- **Volcado diferido.** Escribir el archivo completo en cada `INSERT` sería costoso, así que las
  escrituras seguidas se agrupan en un volcado con 150 ms de retardo.
- **Volcado forzado.** Android puede matar la aplicación en segundo plano sin aviso, por lo que
  `visibilitychange` dispara un volcado inmediato.
- **Notificación de cambios.** Un contador de versión y un conjunto de suscriptores alimentan
  `useSyncExternalStore`.

### Estado — `src/estado`

`ProveedorDatos` abre la base antes de montar la interfaz y comparte la estatura. Todo lo demás se
lee bajo demanda:

```ts
const dias = useConsulta(resumenDiario);
```

`useConsulta` vuelve a ejecutar la consulta solo cuando cambia la versión de la base. Da igual desde
qué pantalla se escribió: todas revalidan. Es el reemplazo de un patrón anterior en el que un
contador `rev` viajaba por props y las dependencias de `useMemo` había que recordarlas a mano.

## Modelo de datos

```sql
CREATE TABLE registros (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts_utc     INTEGER NOT NULL,          -- instante real, en milisegundos UTC
  fecha_lima TEXT    NOT NULL,          -- 'AAAA-MM-DD' ya resuelto a UTC−5
  hora_lima  TEXT    NOT NULL,          -- 'HH:MM:SS'
  peso_kg    REAL    NOT NULL CHECK (peso_kg > 0)
);
CREATE INDEX idx_registros_fecha ON registros(fecha_lima);
CREATE INDEX idx_registros_ts    ON registros(ts_utc);

CREATE TABLE config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
```

Guardar la fecha de Lima junto al instante UTC es una desnormalización deliberada: permite agrupar
por día con un `GROUP BY fecha_lima` que usa índice, en vez de calcular el desfase horario dentro de
la consulta. El instante UTC se conserva porque es el dato verdadero y permite recalcular todo si
algún día cambiara la regla de la zona horaria.

`config` es una tabla de una sola fila lógica (`estatura_m`). La tabla de registros se mantuvo con
un solo propósito: guardar pesadas.

## El gráfico

`screens/Progreso.tsx` dibuja SVG directamente. El eje X se escala por días reales transcurridos
—no por posición en el arreglo—, así que un hueco de una semana sin pesarse se ve como un hueco. La
tendencia es una regresión por mínimos cuadrados sobre los promedios diarios y aparece a partir de
tres puntos. La franja verde de fondo es el rango de peso que corresponde a un IMC entre 18.5 y 25
para la estatura configurada.

## Estrategia de pruebas

| Qué se prueba | Cómo |
|---|---|
| Fechas de Perú | Cruces de medianoche UTC, ida y vuelta entre fecha e instante, fin de mes, año bisiesto. |
| Zonas de IMC | Los cinco tramos y los bordes exactos (18.5, 25 y 30 caen del lado correcto). |
| Consultas | SQLite real en memoria: inserción, actualización, borrado, agrupación por día e importación de respaldos sin duplicar. |

Lo que no se prueba automáticamente es la interfaz: se verificó a mano en Chrome (registro,
validaciones, persistencia entre recargas, funcionamiento sin conexión y ausencia de errores en
consola).

## Compilación

Una sola compilación de Vite con rutas relativas (`base: './'`) sirve para los tres destinos:

1. **PWA** servida desde la raíz de un dominio.
2. **Subdirectorio** `/app/` del sitio de producto.
3. **APK**, donde Capacitor empaqueta los mismos archivos y los sirve desde el propio dispositivo.

`scripts/construir-sitio.mjs` junta el sitio de producto y la aplicación en la carpeta `sitio/`, que
es el artefacto que se publica tanto en GitHub Pages como en la VM de Oracle.
