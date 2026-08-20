# Despliegue

Lo que se publica es siempre la misma carpeta:

```bash
npm run build   # compila apps/app y apps/landing
npm run sitio   # arma sitio/  ->  landing en la raíz, aplicación en /app
```

```
sitio/
├── index.html          sitio de producto
├── estaticos/          CSS y JS del sitio
├── capturas/           imágenes
└── app/                aplicación instalable (PWA con service worker)
```

---

## 1. GitHub Pages

Automático en cada empuje a `main` mediante el flujo [`pages.yml`](../.github/workflows/pages.yml).

Configuración necesaria una sola vez, en **Settings → Pages → Build and deployment**:
seleccionar **GitHub Actions** como origen.

Queda publicado en `https://oscardanielnc.github.io/control-weight/`, con la aplicación en
`.../control-weight/app/`. Las rutas del proyecto son relativas, así que funciona igual en un
subdirectorio que en un dominio propio.

---

## 2. VM de Oracle Cloud

La VM solo sirve archivos estáticos: no ejecuta Node ni nada del proyecto.

### 2.1 Abrir los puertos

Oracle Cloud filtra en dos niveles y hay que abrir los dos:

1. **Lista de seguridad de la subred** (consola de Oracle → *Networking → Virtual Cloud Networks →
   la subred → Security Lists*): reglas de entrada para TCP 80 y 443 desde `0.0.0.0/0`.
2. **Cortafuegos de la instancia.** Las imágenes de Oracle Linux traen `firewalld` y las de Ubuntu
   reglas de `iptables` preinstaladas:

   ```bash
   # Oracle Linux
   sudo firewall-cmd --permanent --add-service=http --add-service=https
   sudo firewall-cmd --reload

   # Ubuntu
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### 2.2 Preparar el servidor

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx rsync
sudo mkdir -p /var/www/control-weight /var/www/certbot
sudo chown -R "$USER":www-data /var/www/control-weight
```

Copiar la configuración del repositorio, reemplazando `TU_DOMINIO`:

```bash
sudo cp deploy/nginx/seguridad.conf /etc/nginx/snippets/control-weight-seguridad.conf
sudo cp deploy/nginx/control-weight.conf /etc/nginx/sites-available/control-weight.conf
sudo sed -i 's/TU_DOMINIO/mi-dominio.com/g' /etc/nginx/sites-available/control-weight.conf
sudo ln -sf /etc/nginx/sites-available/control-weight.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 2.3 Certificado TLS

```bash
sudo certbot --nginx -d mi-dominio.com
sudo systemctl enable --now certbot.timer   # renovación automática
```

El service worker y la instalación de la PWA **requieren HTTPS**: sin certificado válido, la
aplicación se ve pero no se instala ni funciona sin conexión.

### 2.4 Publicar

Desde la máquina de desarrollo:

```bash
./deploy/desplegar.sh usuario@ip-de-la-vm
```

El script verifica (linter, tipos y pruebas), compila, sincroniza por rsync con `--delete` y recarga
Nginx solo si la configuración es válida. Para cambiar la ruta remota:
`RUTA_REMOTA=/otra/ruta ./deploy/desplegar.sh usuario@ip`.

### 2.5 Comprobaciones después de desplegar

```bash
# Cabeceras de seguridad presentes
curl -sI https://mi-dominio.com | grep -iE 'content-security|strict-transport|x-content-type|referrer|permissions'

# La aplicación responde y el service worker se sirve sin caché
curl -sI https://mi-dominio.com/app/ | head -3
curl -sI https://mi-dominio.com/app/sw.js | grep -i cache-control

# El binario de SQLite llega con su tipo correcto
curl -sI https://mi-dominio.com/app/sql-wasm.wasm | grep -i content-type   # application/wasm
```

En el teléfono: abrir el sitio, entrar a *Abrir la app web*, agregarla a la pantalla de inicio,
activar el modo avión y comprobar que sigue funcionando.

---

## 3. APK

El flujo [`apk.yml`](../.github/workflows/apk.yml) compila el APK en la nube. Se ejecuta a mano
desde *Actions* o al publicar una etiqueta:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Con la etiqueta, además de compilar, crea la *Release* con `mi-peso.apk` y su huella SHA-256
adjuntos: es exactamente lo que enlaza el botón de descarga del sitio.

### Firmar la versión de publicación

Sin secretos configurados, el flujo produce un APK de depuración. Para uno firmado, generar el
almacén de claves y guardarlo como secretos del repositorio:

```bash
keytool -genkeypair -v -keystore mi-peso.jks -alias mi-peso \
        -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 mi-peso.jks > mi-peso.jks.base64
```

En **Settings → Secrets and variables → Actions**:

| Secreto | Contenido |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | el contenido de `mi-peso.jks.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | contraseña del almacén |
| `ANDROID_KEY_ALIAS` | `mi-peso` |
| `ANDROID_KEY_PASSWORD` | contraseña de la clave |

**Guarda el archivo `.jks` fuera del repositorio y no lo pierdas**: sin él no se pueden publicar
actualizaciones que Android acepte como la misma aplicación.

### Compilar en local

Requiere JDK 21 y el SDK de Android:

```bash
npm run apk        # -> apps/app/android/app/build/outputs/apk/debug/app-debug.apk
```
