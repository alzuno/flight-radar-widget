# Flight Radar Widget — Plan de ejecución

## Contexto

El usuario vive en el centro de Madrid (frente al Bernabéu) y quiere un widget de escritorio para macOS que muestre en vivo los aviones cercanos a su casa (con foco en las llegadas a Barajas), usando la REST API de OpenSky Network con credenciales OAuth2 ya generadas y probadas (ver `api/opensky_credentials.json`, verificado con una llamada real a `/states/all` que devolvió 58 aeronaves).

Decisiones ya tomadas con el usuario:
- **Repo GitHub**: público, nombre `flight-radar-widget` (gh CLI ya autenticado como `alzuno`).
- **Carpeta local**: renombrar `/Users/alzuno/Code/OpenSky` → `/Users/alzuno/Code/flight-radar-widget` para que coincida con el repo.
- **Stack**: Electron + Vite + React.
- **Visualización**: radar circular clásico (blips sobre anillos de distancia, sin mapa real de fondo) — más liviano, sin dependencias de tiles externos.
- **Comportamiento de widget**: ventana Electron sin bordes, transparente, fijada con `setAlwaysOnTop(true, 'desktop')` (nivel de macOS que usa Übersicht), con auto-arranque vía `app.setLoginItemSettings({ openAtLogin: true })`.
- Nombre del proyecto deliberadamente genérico ("flight-radar-widget", no "opensky-*") porque el usuario prevé conectar otras fuentes de datos más adelante.

El proyecto se ejecutará por milestones grandes, cada uno un checkpoint para revisar antes de seguir.

## Estado actual

- **Milestone 1: cerrado.** Repo scaffolded, pusheado y verificado (ver detalle marcado abajo). Tag `v0.1.0` y entrada en `CHANGELOG.md` creados.
- **Milestone 2: cerrado.** Capa de datos OpenSky (auth OAuth2 + polling + IPC) implementada y verificada.
- **Siguiente paso**: Milestone 3 — UI del radar (renderer/React).

## Seguridad de credenciales (aplica a todos los milestones)

El repo será público, así que el `client_secret` **nunca** debe llegar a git:
- Las credenciales viven en un `.env` local (no versionado), leído solo por el proceso principal de Electron (nunca expuesto al renderer).
- `.gitignore` incluye `.env`, `api/opensky_credentials.json`, `node_modules`, `dist`, `.DS_Store`.
- Se añade `.env.example` con las claves vacías, para que el propio usuario (u otros) sepan qué configurar.
- El intercambio de token OAuth2 y las llamadas a OpenSky se hacen en el **proceso principal** (main process) de Electron, no en el renderer, para no exponer el secreto ni siquiera indirectamente vía devtools.

## Milestone 1 — Setup del repo y estructura base ✅ CERRADO

- [x] Renombrar la carpeta local `OpenSky` → `flight-radar-widget`.
- [x] Inicializar git, crear `.gitignore` (según sección de seguridad arriba), mover `api/opensky_credentials.json` fuera del árbol versionado (o confirmar que ya está ignorado) y crear `.env.example`.
- [x] Crear el repo público en GitHub (`gh repo create alzuno/flight-radar-widget --public --source=. --remote=origin --push`) y hacer el primer push.
- [x] Scaffolding de Electron + Vite + React (con `electron-vite`), con estructura:
  - `src/main/index.ts` — proceso principal (ventana placeholder; auth OpenSky y polling quedan para Milestone 2)
  - `src/preload/index.ts` — puente `contextBridge`
  - `src/renderer/src/` — UI React (`App.tsx`, `main.tsx`, `index.html`)
  - Nota: `src/main/opensky.ts` (cliente OpenSky) **no se creó aún** — corresponde a Milestone 2.
- [x] README inicial con descripción del proyecto y cómo configurar `.env`.
- [x] `CLAUDE.md` creado con comandos y arquitectura del repo para futuras sesiones (incluye nota sobre `ELECTRON_RUN_AS_NODE` en el sandbox).

**Verificación**: ✅ `npm run dev` levanta una ventana Electron real (se confirmó que el sandbox de ejecución define `ELECTRON_RUN_AS_NODE=1`, lo que rompe el arranque de Electron; hay que correrlo con `env -u ELECTRON_RUN_AS_NODE npm run dev`). Repo visible en `https://github.com/alzuno/flight-radar-widget`.

## Milestone 2 — Capa de datos OpenSky (proceso principal) ✅ CERRADO

- [x] `src/main/config.ts`: carga `.env` (vía `dotenv`) y valida las variables requeridas (credenciales, coordenadas de casa, bbox, intervalo de polling).
- [x] `src/main/opensky.ts`: `OpenSkyClient` con OAuth2 client-credentials, cache de token (renovación automática ~1 min antes de expirar) y `fetchStates()` contra `/states/all` con el bbox fijo de Bernabéu/Barajas. `startPolling()` reintenta una vez en 401 (token refrescado) y aplica backoff exponencial (30s → hasta 5 min) ante errores/429.
- [x] IPC: main envía `flights:update` por `webContents.send`; preload lo expone de forma segura vía `contextBridge` como `window.api.onFlightsUpdate()` (sin tocar `nodeIntegration`, sin exponer el token).
- [x] `App.tsx` (renderer) suscrito a `onFlightsUpdate`, logueando los vuelos recibidos en consola de devtools como verificación provisional (el radar visual llega en Milestone 3).

**Verificación**: ✅ `npm run dev` (con `ELECTRON_RUN_AS_NODE` unset) mostró en consola del proceso principal `[opensky] 8/10 aeronaves recibidas` en ciclos consecutivos de ~25s, confirmando token OAuth2 válido y datos reales cerca de Barajas llegando por IPC al renderer. `tsc --noEmit` limpio en ambos proyectos (`tsconfig.node.json` y `tsconfig.web.json`).

**Fix de scope adicional**: se corrigieron dos errores de `tsc --noEmit` preexistentes de Milestone 1 (no bloqueaban `npm run dev`/`build` porque Vite no type-checkea, pero sí rompían la verificación de tipos): `baseUrl` removido en TypeScript 7 (`tsconfig.web.json`) y el namespace global `JSX` no disponible con React 19 (`App.tsx` ahora usa `React.JSX.Element`). Se añadió `src/shared/types.ts` para compartir el tipo `FlightState` entre main/preload/renderer sin cruzar los límites de los proyectos de tsconfig.

## Milestone 3 — UI del radar (renderer/React)

- Componente de radar circular centrado en la casa del usuario (coordenadas configurables), con:
  - Anillos concéntricos de distancia (ej. 10/25/50 km).
  - Blips por avión, posicionados por distancia/bearing calculado desde lat/lon del usuario respecto a cada aeronave (fórmula haversine + bearing).
  - Tooltip/etiqueta al hacer hover: callsign, altitud, velocidad, país de origen.
  - Opcional: barrido animado tipo radar clásico (CSS/SVG).
- Manejo de estado con los datos que llegan por IPC desde el main process.

**Verificación**: con la app corriendo, ver aviones reales moviéndose en el radar en tiempo casi real, con hover mostrando datos correctos.

## Milestone 4 — Comportamiento de widget de escritorio

- Configurar `BrowserWindow`: `frame: false`, `transparent: true`, `resizable: false`, `hasShadow: false`.
- `win.setAlwaysOnTop(true, 'desktop')` para fijarlo al nivel del escritorio (detrás de apps, encima del wallpaper).
- `win.setVisibleOnAllWorkspaces(true)` para que persista al cambiar de escritorio virtual.
- Auto-arranque: `app.setLoginItemSettings({ openAtLogin: true })`, con un ítem de menú (tray icon) para activar/desactivar.
- Icono en la barra de menú (tray) con opciones básicas: mostrar/ocultar, salir, abrir configuración.

**Verificación**: reiniciar sesión de macOS y confirmar que el widget arranca solo, se ve pegado al escritorio y no interfiere con el uso normal del Mac.

## Milestone 5 — Pulido y empaquetado

- Pantalla/mini-formulario de configuración (coordenadas de casa, radio del bounding box, intervalo de polling) persistida en disco (ej. `electron-store`).
- Empaquetado con `electron-builder` para generar un `.app`/`.dmg` instalable localmente.
- Documentación final en README (setup, configuración, capturas).

**Verificación**: generar el build empaquetado, instalarlo, y correrlo como app standalone (sin `npm run dev`).

## Flujo de versionamiento (aplica a todos los milestones)

- Cada cambio funcional (dentro de un milestone o incluso subtareas dentro de un milestone) se commitea y se pushea a `origin` — no se acumulan cambios grandes sin versionar.
- Se usa un sistema de versionamiento oficial: **SemVer** (`MAJOR.MINOR.PATCH`) reflejado en `package.json`, con tags de git (`vX.Y.Z`) al cerrar cada milestone.
- Los mensajes de commit deben describir claramente qué se hizo (qué se implementó/corrigió y por qué), no mensajes genéricos tipo "wip" o "changes".
- Al finalizar cada milestone se crea un tag de versión y se actualiza un `CHANGELOG.md` con el resumen de lo agregado.

## Notas de alcance

- No se cubre en este plan: soporte multi-plataforma (Windows/Linux), notificaciones push, ni integración con otras fuentes de datos (mencionado por el usuario como posible trabajo futuro, por eso el nombre genérico del repo).
