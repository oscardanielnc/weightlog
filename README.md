<div align="center">

# Mi Peso

**Body-weight and BMI tracking that never leaves the phone.**
An installable web app (PWA) and an Android APK, built from a single codebase.

[![CI](https://github.com/oscardanielnc/control-weight/actions/workflows/ci.yml/badge.svg)](https://github.com/oscardanielnc/control-weight/actions/workflows/ci.yml)
[![APK](https://github.com/oscardanielnc/control-weight/actions/workflows/apk.yml/badge.svg)](https://github.com/oscardanielnc/control-weight/actions/workflows/apk.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Live site](https://weightlog.oscarnavarro.dev/) ·
[Download the APK](https://github.com/oscardanielnc/control-weight/releases/latest/download/mi-peso.apk) ·
[Architecture](docs/ARQUITECTURA.md) ·
[Security](SECURITY.md)

<img src="docs/capturas/1-registro.png" width="200" alt="Weight entry screen" />
<img src="docs/capturas/2-calendario.png" width="200" alt="Calendar colour-coded by BMI" />
<img src="docs/capturas/3-progreso.png" width="200" alt="Progress chart" />
<img src="docs/capturas/4-ajustes.png" width="200" alt="Settings and backup" />

</div>

> **A note on language.** The product, the source code and the extended docs are written in Spanish,
> because the app ships to Spanish-speaking users and the domain vocabulary (*peso*, *estatura*,
> *registro*) reads better untranslated in the code. This README is in English so the engineering
> decisions are legible to a wider audience. Each section links to the Spanish document that goes
> deeper.

---

## What it does

Log a weight in two taps, then see what is actually happening to it.

| Screen | Problem it solves |
|---|---|
| **Registro** (Log) | The landing screen: a weight field and a *Register* button. Stores the exact Peru date and time, then shows the day's average with its BMI and the delta against the previous day. |
| **Calendario** (Calendar) | Every day is tinted by the BMI of **that day's average**: green inside the ideal range, amber near the limit, red outside it, grey when nothing was logged. Tapping a day opens every weigh-in it contains. |
| **Progreso** (Progress) | Weight against time, with the ideal range as a background band and a least-squares trend line. Filters for 7 / 30 / 90 days or the whole history. |
| **Ajustes** (Settings) | Height (the basis for BMI), the colour table translated into kilograms, JSON backup, and a two-step destructive reset. |

## Domain rules

These are the rules the code enforces, and the reason the data layer looks the way it does.

- **Peru time, resolved at write time.** Peru has been a fixed UTC−5 since 1994, with no daylight
  saving. Each record stores the UTC instant *and* the already-resolved Lima date and time, so which
  day a weigh-in belongs to never depends on the timezone the device happens to be set to.
- **One day, one value.** Multiple weigh-ins on the same day collapse to their arithmetic mean.
- **WHO BMI cut-offs**, translated into kilograms for a height of 1.60 m:

  | BMI | Colour | Weight |
  |---|---|---|
  | < 17 | red | under 43.5 kg |
  | 17 – 18.5 | amber | 43.5 – 47.4 kg |
  | **18.5 – 25** | **green** | **47.4 – 64.0 kg** |
  | 25 – 30 | amber | 64.0 – 76.8 kg |
  | ≥ 30 | red | 76.8 kg and above |

- **Validation.** Weight between 20 and 300 kg to one decimal place; height between 1.00 and 2.50 m.

> Mi Peso is a personal tracking tool, not a medical device. BMI is an indicative measure and does
> not distinguish muscle from fat.

## Engineering decisions

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript in strict mode | Small components, and types that model the domain itself (BMI zones, daily summaries) rather than raw primitives. |
| State | `useSyncExternalStore` over the database | One source of truth: any write revalidates every screen, with no change counters threaded through props. |
| Data | SQLite compiled to WebAssembly (`sql.js`) | Daily averages, extremes and counts come from one `GROUP BY` query against an index, not from walking arrays in JavaScript on every render. |
| Persistence | The SQLite file flushed to IndexedDB | Writes are batched behind a short delay and force-flushed when the app is backgrounded. |
| Charts | Hand-written SVG | A line chart with a trend line and a band does not justify a 100 kB dependency. |
| Packaging | Vite 8 · vite-plugin-pwa (Workbox) · Capacitor 8 | The same build installs from the browser or ships as an APK. |
| Quality | Vitest · oxlint · `tsc` · GitHub Actions | 30 tests, including ones that run against a real in-memory SQLite database. |
| Delivery | GitHub Pages and containerised Nginx on Oracle Cloud | Both targets serve the identical artefact produced by `npm run sitio`. |

Each trade-off, including the ones that were rejected, is recorded in
[docs/DECISIONES.md](docs/DECISIONES.md); the runtime picture is in
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

### Design system

The interface follows a light pastel design system with a measured accessibility floor: every
text/background pair clears **WCAG AA (4.5:1)** in both light and dark themes, verified against the
rendered app rather than assumed from the palette. Numeric output uses `tabular-nums` throughout so
figures do not shift as values change, touch targets are at least 44×44 px, and the typeface is
self-hosted because an offline-first app cannot depend on a font CDN.
See [design/stitch/README.md](design/stitch/README.md) for the tokens and the contrast measurements.

## Repository layout

```
apps/
  app/                 PWA + Android project (Capacitor)
    src/lib/           domain: Peru dates, BMI, SQLite schema and queries
    src/estado/        data provider and hooks (useConsulta)
    src/componentes/   shared presentational components
    src/screens/       Registro · Calendario · Progreso · Ajustes
    android/           native project that produces the APK
  landing/             product site (HTML, CSS and one script, zero dependencies)
deploy/                Nginx configuration and deployment scripts
design/                design system and reference mockups
docs/                  architecture, decisions and deployment
scripts/               assembles the publishable site (landing + /app)
.github/workflows/     CI, site publishing and APK build
```

## Local development

Requires Node 22 or newer.

```bash
npm install          # installs dependencies for the whole monorepo
npm run dev          # app on http://localhost:5173
npm run dev:landing  # product site
npm test             # 30 tests (Vitest)
npm run verificar    # lint + types + tests + build: exactly what CI runs
npm run sitio        # assembles sitio/ with the landing at the root and the app under /app
```

## Installing on a phone

**APK.** [Download `mi-peso.apk`](https://github.com/oscardanielnc/control-weight/releases/latest/download/mi-peso.apk)
directly, open it on the phone and allow installation from that source. The
[accompanying `.sha256`](https://github.com/oscardanielnc/control-weight/releases/latest/download/mi-peso.apk.sha256)
lets you verify the APK is the one that came out of the public build. It is currently signed with a
debug key, so Android will warn about an unknown source — the checksum is what establishes
provenance until a release keystore is configured.

**Web app.** Open the site in Chrome and choose *Add to Home screen*. It keeps its icon, runs
full-screen and works offline.

Building the APK locally needs JDK 21 and the Android SDK:

```bash
npm run apk          # builds, syncs Capacitor and produces the debug APK
npm run android:studio
```

With neither installed, the **APK** GitHub Actions workflow builds it in the cloud.

## Deployment

`npm run sitio` produces the `sitio/` directory, which is the only thing published. There are two
independent targets — updating one does not update the other:

- **GitHub Pages** — published automatically on every push to `main` (`pages.yml`).
- **weightlog.oscarnavarro.dev** — an Oracle Cloud VM serving the site from a hardened Nginx
  container, exposed through a Cloudflare tunnel that terminates TLS. Updated by re-running
  `./deploy/docker/desplegar-vm.sh` on the box, which rebuilds inside a disposable `node:22-alpine`
  container so the server never needs Node installed.

Full server steps — firewall, tunnel and header verification — are in
[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Privacy and security

There is no server, no account and no telemetry: the history lives on the device and the app has
nowhere to send it. The production build ships a Content-Security-Policy that confines everything to
its own origin, and the APK disables Android's automatic cloud backup. The container that serves the
site runs read-only, with `no-new-privileges`, all capabilities dropped except the four Nginx needs,
and explicit memory, CPU and process limits.

The full threat model is in [SECURITY.md](SECURITY.md).

Because the data exists only on the phone, **export the JSON backup before switching devices or
uninstalling the app**.

## License

[MIT](LICENSE) · Oscar Navarro
