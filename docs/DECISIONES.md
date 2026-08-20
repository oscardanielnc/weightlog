# Decisiones de diseño

Registro corto de las decisiones que definieron el proyecto: qué se eligió, contra qué y por qué.
Cada una está fechada; si alguna se revierte, se agrega la razón en lugar de borrarla.

---

## 1. PWA y APK desde una sola base de código (2026-08)

**Alternativas:** Kotlin nativo · Flutter · solo PWA.

**Decisión:** aplicación web con Vite y React, empaquetada como APK con Capacitor.

**Por qué:** el producto es un formulario, un calendario y un gráfico sobre una base local; nada de
eso necesita API nativas. Con un único código fuente se obtiene la aplicación instalable desde el
navegador y el APK, y el proyecto puede compilarse sin tener el SDK de Android instalado (lo hace
GitHub Actions).

**Costo aceptado:** el APK arrastra un WebView y la aplicación no aparece en Play Store sin más
trámite. Ninguno de los dos afecta al uso previsto.

---

## 2. SQLite embebido en vez de `localStorage` (2026-08)

**Alternativas:** `localStorage` con JSON · IndexedDB con objetos sueltos.

**Decisión:** SQLite compilado a WebAssembly (`sql.js`), con el archivo persistido en IndexedDB.

**Por qué:** las tres pantallas de lectura piden agregaciones —promedio, mínimo, máximo y conteo por
día— que en SQL son una consulta con `GROUP BY` y un índice, y en JavaScript serían un recorrido
completo del historial en cada render. Además deja el camino abierto a consultas nuevas
(promedios móviles, comparaciones por mes) sin reescribir la capa de datos.

**Costo aceptado:** unos 900 kB de WebAssembly precargados por el service worker, y el archivo
completo se vuelca en cada guardado. Con un registro diario, el archivo sigue siendo diminuto
durante años.

---

## 3. Hora de Perú como desfase fijo UTC−5 (2026-08)

**Alternativas:** guardar solo el instante UTC y formatear con `Intl` · usar la zona horaria del
dispositivo.

**Decisión:** guardar el instante UTC y, además, la fecha y hora de Lima ya resueltas con un desfase
fijo de −5 horas.

**Por qué:** Perú no aplica horario de verano desde 1994, así que el desfase es constante y no hace
falta una base de zonas horarias. Fijarlo evita que el día al que pertenece una pesada cambie porque
el teléfono viaja, tiene mal la configuración o el sistema operativo actualiza sus reglas.

**Costo aceptado:** si algún día Perú cambiara de huso, habría que recalcular la columna derivada;
como el instante UTC se conserva, la migración sería un `UPDATE`.

---

## 4. Promedio aritmético del día (2026-08)

**Alternativas:** primera pesada del día · última · mediana.

**Decisión:** promedio aritmético de todas las pesadas del día.

**Por qué:** el peso oscila un kilo o más a lo largo del día; promediar reduce el ruido sin
descartar información y es la regla más fácil de explicar. El detalle del día muestra igualmente
cada pesada con su hora.

---

## 5. Gráfico en SVG a mano (2026-08)

**Alternativas:** Chart.js · Recharts · D3.

**Decisión:** SVG generado directamente en el componente.

**Por qué:** el gráfico necesita una línea, un área, una banda de referencia, una tendencia y una
cruz de inspección. Escribirlo son unas 200 líneas y evita 100 kB de dependencia, un tema que
adaptar y una superficie de actualizaciones que auditar. El eje X se escala por días reales, algo
que además hay que configurar a mano en casi cualquier librería.

---

## 6. `useSyncExternalStore` en lugar de un contador de refresco (2026-08)

**Antes:** un contador `rev` en el contexto que las pantallas incluían en las dependencias de
`useMemo` y que cada escritura tenía que incrementar llamando a `refrescar()`.

**Decisión:** la capa de datos publica una versión y notifica a sus suscriptores; las pantallas leen
con `useConsulta(consulta)`.

**Por qué:** el patrón anterior dependía de recordar dos cosas en cada escritura (llamar a
`refrescar` y poner `rev` en las dependencias); olvidar cualquiera de las dos dejaba la interfaz
desactualizada sin error visible. Ahora la invalidación es responsabilidad de la única función que
escribe.

---

## 7. Monorepo con dos aplicaciones (2026-08)

**Decisión:** espacios de trabajo de npm con `apps/app` (producto) y `apps/landing` (sitio).

**Por qué:** el sitio de descarga y la aplicación se publican juntos y comparten capturas, versión y
tuberías de compilación, pero no comparten dependencias: el sitio no tiene ninguna. Separarlos deja
claro qué se ejecuta en el teléfono y qué solo se sirve como HTML.

---

## 8. Seguridad desde el primer despliegue (2026-08)

**Decisión:** política de contenido estricta inyectada en la compilación de producción, cabeceras de
seguridad en Nginx, respaldo de Android desactivado, tráfico en claro bloqueado y auditoría de
dependencias en CI.

**Por qué:** el proyecto guarda datos de salud. Que sean locales reduce el riesgo, pero no lo
elimina: quedan la cadena de suministro (dependencias), el transporte del sitio y el propio
dispositivo. Fijar las restricciones antes del primer despliegue evita tener que aflojarlas después
para no romper algo.

**Pendiente:** auditoría formal —revisión de dependencias, cabeceras, permisos del APK y manejo del
respaldo— antes de considerar el proyecto terminado.
