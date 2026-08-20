# Seguridad

Mi Peso guarda datos de salud de una persona. La mejor defensa disponible fue quitar al servidor de
la ecuación: **no hay backend, no hay cuenta y no hay ninguna petición de red**. Lo que queda por
proteger es el dispositivo, el transporte del sitio y la cadena de suministro.

## Modelo de amenazas

| Amenaza | Situación |
|---|---|
| Filtración desde el servidor | **No aplica.** No existe servidor de datos: el historial nunca sale del dispositivo. |
| Intercepción en la red | **No aplica al uso normal.** La aplicación no hace peticiones. El sitio de descarga se sirve por HTTPS con HSTS. |
| Código de terceros inyectado en la página | Mitigado con una política de contenido estricta: sin CDN, sin fuentes remotas y sin analítica. Nada externo se carga. |
| Dependencia comprometida (cadena de suministro) | Mitigado parcialmente: `npm ci` con `package-lock.json`, `npm audit` en CI y Dependabot semanal. Es el riesgo residual principal. |
| Otra aplicación del teléfono leyendo la base | La base vive en el almacenamiento privado de la aplicación (IndexedDB del navegador o del WebView). Android lo aísla por UID. |
| Copia de seguridad del teléfono llevando los datos a la nube | Mitigado: `allowBackup="false"` y `fullBackupContent="false"` en el APK. |
| Pérdida del dispositivo | El respaldo JSON exportable es responsabilidad del usuario. La aplicación no cifra la base: quien tenga el teléfono desbloqueado ve los datos. |
| Archivo de respaldo malicioso al importar | La importación valida cada fila, descarta las corruptas, acota la estatura y corre dentro de una transacción con reversión. |

## Controles aplicados

### En la aplicación web

- **Política de contenido** inyectada en la compilación de producción (`apps/app/vite.config.ts`):

  ```
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none';
  form-action 'none'; frame-ancestors 'none'
  ```

  `wasm-unsafe-eval` es el único permiso extra y lo exige SQLite compilado a WebAssembly.
  `connect-src 'self'` deja sin salida cualquier intento de exfiltración desde la propia página.

- **Sin dependencias en tiempo de ejecución más allá de React y sql.js.** El sitio de producto no
  tiene ninguna: es HTML, CSS y un archivo JavaScript propios.
- **Sin telemetría, sin cookies, sin almacenamiento compartido entre orígenes.**
- El *service worker* solo cachea archivos del propio origen y nunca intercepta peticiones externas
  porque no las hay.

### En el APK

- `allowBackup="false"` y `fullBackupContent="false"`: el historial no viaja a la copia de seguridad
  de Google.
- `usesCleartextTraffic="false"` y una configuración de seguridad de red que bloquea HTTP en claro.
- Un único permiso: `INTERNET`, que el WebView de Capacitor necesita para cargar los archivos
  empaquetados desde `https://localhost`. No hay ninguna llamada saliente.
- Orientación fija y una sola actividad exportada (la de lanzamiento).
- La firma de la versión de publicación usa un almacén de claves que llega por variables de entorno
  desde los secretos de GitHub Actions; nunca está en el repositorio.

### En el sitio publicado

Cabeceras servidas por Nginx ([`deploy/nginx/seguridad.conf`](deploy/nginx/seguridad.conf)):

`Content-Security-Policy` · `Strict-Transport-Security` · `X-Content-Type-Options: nosniff` ·
`X-Frame-Options: DENY` · `Referrer-Policy` · `Permissions-Policy` (cámara, micrófono, ubicación y
sensores denegados) · `Cross-Origin-Opener-Policy` · `Cross-Origin-Resource-Policy`.

Además: TLS 1.2/1.3, redirección permanente a HTTPS, `server_tokens off`, sin listado de directorios
y acceso denegado a archivos ocultos.

### En el proceso

- `npm ci` contra `package-lock.json` en todas las compilaciones.
- `npm audit --audit-level=high` como trabajo propio de CI.
- Dependabot semanal para npm, Gradle y las acciones de GitHub.
- Cada APK publicado incluye su huella SHA-256 para verificar la descarga.

## Riesgos conocidos y aceptados

1. **La base no está cifrada.** Con el teléfono desbloqueado, los datos son legibles por quien lo
   tenga. Cifrarla exigiría pedir una clave en cada apertura, lo que no compensa para un registro de
   peso personal. Si se quisiera, el camino sería SQLCipher en el lado nativo.
2. **Tres vulnerabilidades moderadas** informadas por `npm audit` provienen de `uuid@7` a través de
   `xcode`, dependencia de `@capacitor/cli`. Es una herramienta de desarrollo: no se empaqueta en el
   APK ni en la PWA. Por eso CI falla solo ante severidad alta o crítica.
3. **El APK de depuración** que produce el flujo sin secretos de firma está firmado con la clave de
   depuración de Android. Sirve para uso personal; para distribuirlo hay que configurar el almacén
   de claves de publicación.

## Auditoría pendiente

Antes de dar el proyecto por cerrado queda una revisión formal: verificación de cabeceras en el
dominio real, repaso de permisos y configuración del APK, revisión del árbol de dependencias y
prueba de importación con archivos de respaldo malformados.

## Reportar un problema

Si encuentras una vulnerabilidad, abre un *issue* en
[el repositorio](https://github.com/oscardanielnc/control-weight/issues) describiendo el impacto y
cómo reproducirlo. Es un proyecto personal: no hay un programa de recompensas ni un plazo de
respuesta comprometido.
