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
- **Milestone 3: cerrado.** UI del radar (renderer/React) implementada y verificada visualmente. Mejoras adicionales aplicadas después del cierre (ver sección "Mejoras post-M3" más abajo): estela histórica, callsign visible, aeropuertos cercanos, radar recentrado en Barajas con radio de 10 km, y fix de un bug real de ventana destruida en el proceso principal.
- **Siguiente paso**: Milestone 4 — Comportamiento de widget de escritorio.

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

## Milestone 3 — UI del radar (renderer/React) ✅ CERRADO

- [x] `src/shared/geo.ts`: `distanceKm()` (haversine) y `bearingDeg()` (rumbo inicial 0-360°) entre dos coordenadas.
- [x] IPC adicional `config:get-home-location` (main → renderer, solo lat/lon de casa, nunca credenciales) expuesto como `window.api.getHomeLocation()`.
- [x] `src/renderer/src/Radar.tsx` + `Radar.css`: radar circular SVG centrado en casa, con anillos concéntricos 10/25/50 km, blips por avión (posición calculada con distancia/bearing, radio recortado a 50 km), barrido animado (`<g>` rotando vía CSS), y tooltip HTML propio (no `<title>` SVG nativo, poco confiable) que sigue el hover.
- [x] `App.tsx` obtiene `home` una vez al montar y mantiene `flights` en estado, actualizado en cada evento `flights:update` por IPC.

**Verificación**: ✅ probado en vivo por el usuario en la ventana Electron real: radar con anillos/barrido/blips visible correctamente; comparando dos ciclos de polling consecutivos se confirmó que las posiciones de las aeronaves con telemetría fresca sí se recalculan (ej. `346303`: 40.4344,-3.4963 → 40.4437,-3.5059) — las que no cambian es porque OpenSky devuelve posición "stale" para aeronaves sin ADS-B reciente, comportamiento normal de la API gratuita.

**Bugs encontrados y corregidos durante la verificación manual**:
- El tooltip nativo (`<title>` dentro de `<circle>` SVG) no disparaba de forma fiable → se reemplazó por un tooltip HTML controlado por estado de React (hover con `onMouseEnter`/`onMouseLeave`).
- El tooltip quedaba pegado en pantalla al quitar el mouse si mientras tanto llegaba un nuevo ciclo de polling: el hover se guardaba como el objeto `Blip` completo, que se recrea en cada render, así que la comparación por referencia en `onMouseLeave` fallaba tras la actualización. Fix: guardar solo `icao24` (string estable) en el estado de hover y comparar por eso.

### Mejoras post-M3 — radar tipo "radar de aeropuerto"

Tras cerrar M3, el usuario pidió hacer el radar más intuitivo:

- [x] `src/shared/airports.ts` (nuevo): datos estáticos de Barajas (LEMD) y aeródromos menores (Cuatro Vientos LECU, Torrejón LETO, Getafe LEGT), dibujados en el radar como marcadores ámbar con su código, solo si caen dentro del rango visible (`projectInRange`).
- [x] Traza/estela histórica por avión: `history` en estado de React (últimas 10 posiciones por `icao24`), dibujada como segmentos con opacidad creciente (más viejo → más transparente). Se guarda un "período de gracia" de hasta 3 ciclos de polling sin ver a un avión antes de descartar su estela, para que un hueco puntual en los datos de OpenSky no la borre de golpe.
- [x] Callsign siempre visible junto a cada blip (`<text>` con `flight.callsign` o `icao24` si no hay callsign), sin reemplazar el tooltip existente (que sigue mostrando altitud/velocidad/país al hover).
- [x] Radar recentrado en **Barajas (LEMD)** en vez de Bernabéu — se actualizó `HOME_LATITUDE`/`HOME_LONGITUDE` en `.env`/`.env.example` a las coordenadas de LEMD (40.4719, -3.5626). El bbox de consulta a OpenSky no cambió (ya cubre esa zona).
- [x] Radio del radar reducido a 10 km con anillos en 3/6/10 km (antes 10/25/50 km, luego 10/20/30 km en un primer intento) para un efecto más "radar de aeropuerto" y menos disperso.

**Bug real encontrado y corregido** (no relacionado con los datos de OpenSky, sino con el manejo de la ventana de Electron): `src/main/index.ts` guardaba la referencia a la ventana (`win`) una sola vez al arrancar y nunca comprobaba si seguía viva. Si la ventana se cerraba o se recreaba (p.ej. por el hot-reload de `electron-vite` en desarrollo), el proceso principal —que en macOS sigue corriendo en segundo plano tras cerrar todas las ventanas— seguía intentando `webContents.send()` sobre una ventana ya destruida, lanzando `TypeError: Object has been destroyed` en cada ciclo de polling. Desde ese punto el renderer dejaba de recibir `flights:update` y toda la UI (blips, estelas) quedaba congelada — esto era la causa real de que "los aviones desaparecieran" de forma errática, no (solo) el comportamiento normal de datos intermitentes de OpenSky. Fix: guardar `mainWindow` en una variable de módulo, comprobar `!mainWindow.isDestroyed()` antes de enviar, detener el polling (`stopPolling()`) en `window-all-closed`, y añadir el manejador estándar de `activate` de macOS para recrear la ventana si se vuelve a abrir la app sin ventanas.

**Verificación**: ✅ confirmado en vivo por el usuario tras el fix — 6+ ciclos de polling consecutivos sin errores en consola, radar centrado en Barajas con radio de 10 km, estela y callsigns visibles de forma estable.

## Milestone 4 — Comportamiento de widget de escritorio (en curso)

- [x] `BrowserWindow`: `frame: false`, `transparent: true`, `resizable: false`, `hasShadow: false`.
- [x] `win.setAlwaysOnTop(true, 'desktop')` para fijarlo al nivel del escritorio (detrás de apps, encima del wallpaper).
- [x] `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` para que persista al cambiar de escritorio virtual/Spaces.
- [x] Auto-arranque: se activa `app.setLoginItemSettings({ openAtLogin: true })` una sola vez en el primer arranque (marcador en `userData`, ya que `electron-store` llega en Milestone 5), con ítem de menú tipo checkbox en el tray para activar/desactivar libremente después sin que se re-active solo en cada reinicio.
- [x] Icono en la barra de menú (tray, `resources/trayIconTemplate.png`) con: mostrar/ocultar, iniciar con macOS (checkbox), configuración (deshabilitado, placeholder hasta Milestone 5), salir. Cerrar la ventana (no hay barra de título, pero por si acaso) solo la oculta; "Salir" del tray sí termina el proceso.
- [x] Widget arrastrable: el fondo de la ventana es zona de drag (`-webkit-app-region: drag`) salvo el contenedor del radar, que queda `no-drag` para no romper el hover/tooltip de los blips (los SVG no reconocen `no-drag` de forma fiable, así que se excluye a nivel de contenedor HTML).

**Verificado en vivo por el usuario**: ventana sin bordes/transparente mostrando el wallpaper real de macOS a través suyo (confirma `transparent` + nivel `'desktop'`), menú del tray funcionando (mostrar/ocultar, iniciar con macOS, salir), widget arrastrable desde el margen fuera del círculo del radar, y tooltip de blips funcionando tras el fix de drag regions.

**Pendiente para cerrar milestone**: reiniciar sesión de macOS y confirmar que el widget arranca solo (auto-login) y no interfiere con el uso normal del Mac — esto solo lo puede probar el usuario.

### Mejoras adicionales (durante M4) — radar más preciso y navegable

Mientras se verificaba M4, el usuario comparó el radar contra el mapa en vivo de opensky-network.org y pidió ajustes adicionales:

- [x] Filtro de aviones en tierra: `src/renderer/src/Radar.tsx` descarta los vuelos con `onGround: true` antes de calcular blips (el campo ya se parseaba en `src/main/opensky.ts` desde M2, pero no se usaba en el renderer).
- [x] Niveles de zoom/alcance: `ZOOM_LEVELS` con 3 presets de anillos (3/6/10 km, 6/12/18 km, 10/20/30 km), controlados con botones `+`/`−` flotantes (esquina inferior izquierda del radar). El estado de zoom vive solo en memoria de React (no persiste entre reinicios; la persistencia llega con la config de Milestone 5). Al cambiar de nivel se limpia la estela histórica para evitar segmentos con escala inconsistente.
- [x] Bounding box de consulta a OpenSky ampliado de ~9-16 km a ~35 km en las 4 direcciones alrededor de casa (`BBOX_*` en `.env`/`.env.example`), para cubrir el nivel de zoom más lejano (30 km) sin que los aviones desaparezcan del feed antes de salir del radar visual.

**Bug real diagnosticado (no de nuestro código)**: se detectó que algunos aviones desaparecían del radar muy rápido tras alejarse de casa. Verificado con llamadas directas a `/states/all` en vivo: el bbox original tenía bordes asimétricos muy cercanos a casa (norte a 8.7 km, este a 9.5 km), así que un avión despegando podía salir literalmente de la zona de consulta a OpenSky en un solo ciclo de polling (~25s), independientemente del zoom visual del radar. Confirmado el mismo patrón dos veces (`ANE4081` y luego `RYR2CF`) antes y después de ampliar el bbox — con el bbox ampliado, `RYR2CF` siguió visible (clampeado al borde del anillo) mucho más lejos en vez de desaparecer.

**Estelas con posición "stale"**: se confirmó con dos llamadas reales a `/states/all` separadas 28s que varios aviones en vuelo (`onGround: false`) devuelven la misma posición en ambos polls — cobertura desigual de receptores voluntarios de OpenSky, no un bug de polling/render. El mapa en vivo de opensky-network.org disimula esto con dead-reckoning (extrapolando posición con `velocity`/`trueTrack` entre fixes reales) — el usuario decidió posponer esa mejora a un milestone futuro.

**Verificación**: 2 rondas de 8-9 capturas de pantalla consecutivas (`screencapture`, ~26-28s entre cada una) contrastadas contra llamadas directas a `/states/all` en paralelo — posiciones, distancias y estelas de blips coinciden con la trayectoria real reportada por OpenSky en ambas rondas (antes y después de ampliar el bbox).

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
