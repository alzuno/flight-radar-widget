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
- **Siguiente paso**: Milestone 2 — capa de datos OpenSky (auth OAuth2 + polling + IPC).

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

## Milestone 2 — Capa de datos OpenSky (proceso principal)

- Módulo de autenticación OAuth2 (client credentials) con cache de token y renovación automática antes de que expire (30 min).
- Módulo de polling a `/states/all` con bounding box fijo alrededor de Bernabéu/Barajas:
  ```
  lamin=40.35, lomin=-3.75, lamax=40.55, lomax=-3.45
  ```
  (≈0.06 sq°, cuesta 1 crédito por llamada — con polling cada 20-30s el consumo diario queda muy por debajo de los 4,000 créditos/día).
- Intervalo de polling configurable (default 20-30s), con manejo de errores (401 → refrescar token y reintentar; rate limit → backoff).
- IPC (`ipcMain`/`ipcRenderer` o `contextBridge`) para exponer los datos de vuelos al renderer de forma segura (sin exponer el token ni el secret).

**Verificación**: correr la app y loguear en consola los vuelos recibidos cada ciclo de polling; confirmar que se ven aeronaves reales cerca de Barajas.

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
