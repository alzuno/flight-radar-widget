# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/), versionado con [SemVer](https://semver.org/).

## [0.7.0] — 2026-08-14

### Milestone 6 — Ruta (origen-destino) por avión

- `src/main/routeLookup.ts` (nuevo): lookup de ruta por callsign vía **adsbdb.com** (API gratuita, sin auth), con cache en memoria + disco (`routes-cache.json` bajo `userData`), TTL de 12h para rutas resueltas y 30min para negativas (vuelos privados/militares sin ruta conocida), concurrencia limitada y timeout de 5s vía `AbortController`.
- `src/main/index.ts`: el envío de `flights:update` nunca espera a la red — se enriquece con lo que ya está en cache y las rutas nuevas se empujan en un reenvío debounced apenas se resuelven.
- `src/renderer/src/Radar.tsx`: cada blip muestra la ruta (ej. `MAD-BCN`) bajo el callsign, y el tooltip al hacer hover agrega una línea `Ruta: —`.
- `src/shared/types.ts`: `FlightState.route: string | null`.

## [0.6.0] — 2026-08-14

### Milestone 5 — cierre

- `README.md` reescrito de punta a punta: qué hace el widget, uso en desarrollo (incluida la nota de sandbox `ELECTRON_RUN_AS_NODE`), cómo obtener credenciales de OpenSky, empaquetado con `electron-builder` (`npm run dist`) y qué pasa en el primer arranque de un `.app` instalado limpio, estructura del proyecto actualizada a Milestone 5 (settings, credentials, windowState) y sección de seguridad ampliada.
- Captura de pantalla real del radar (`docs/radar.png`) tomada en vivo contra datos reales de OpenSky.

## [0.5.0] — 2026-08-14

### Milestone 4 — cierre confirmado

- Auto-arranque (`app.setLoginItemSettings({ openAtLogin: true })`) verificado en vivo tras reiniciar sesión de macOS: el widget arranca solo sin interferir con el uso normal del Mac.

### Milestone 5 — Slices 1 y 2

- `src/renderer/src/SettingsPanel.tsx`: panel de configuración persistida (home lat/lon, radio del bbox, intervalo de polling), guardado en `settings.json` bajo `userData`.
- Empaquetado con `electron-builder` (`npm run dist` → `.app`/`.dmg` para macOS) y onboarding de credenciales (`src/renderer/src/CredentialsGate.tsx`): las credenciales de OpenSky se piden en el primer arranque y se persisten en `credentials.json` bajo `userData` (sin canal IPC de lectura), en vez de depender de un `.env` que nunca se empaqueta.
- **Fix**: el panel de configuración se desbordaba fuera de su contenedor y quedaba inutilizable.

### Fixes tras probar el `.app` empaquetado con auto-login real

- La posición de la ventana no se guardaba entre reinicios (siempre abría centrada). `src/main/windowState.ts` (nuevo) persiste `{x, y}` y los restaura al crear la ventana.
- El radar dibujaba aviones fuera del radio de zoom seleccionado "aplastados" contra el anillo exterior en vez de ocultarlos. `Radar.tsx` ahora descarta esos blips con `projectInRange()`, igual que ya se hacía con los aeropuertos.

## [0.4.0] — 2026-08-12

### Mejoras post-Milestone 3 — radar más intuitivo

- `src/shared/airports.ts`: marcadores ámbar para Barajas y aeródromos menores cercanos (Cuatro Vientos, Torrejón, Getafe), dibujados solo si caen dentro del rango visible.
- Traza/estela histórica por avión (últimas 10 posiciones, con opacidad decreciente hacia el pasado y un período de gracia de 3 ciclos de polling ante huecos puntuales en los datos de OpenSky).
- Callsign siempre visible junto a cada blip, además del tooltip existente al hover.
- Radar recentrado en Barajas (LEMD) con radio reducido a 10 km (anillos 3/6/10 km), para un efecto más "radar de aeropuerto".
- **Fix de bug real**: el proceso principal (`src/main/index.ts`) seguía enviando actualizaciones a una ventana de Electron ya destruida (`webContents.send` sobre un `BrowserWindow` cerrado/recreado), lo que congelaba la UI y generaba errores silenciosos en cada ciclo de polling. Se corrigió comprobando `isDestroyed()`, deteniendo el polling al cerrar la ventana y añadiendo el manejo estándar de `activate` en macOS.

## [0.3.0] — 2026-08-12

### Milestone 3 — UI del radar (renderer/React)

- `src/shared/geo.ts`: `distanceKm()` (haversine) y `bearingDeg()` para calcular posición relativa de cada aeronave respecto a casa.
- `src/renderer/src/Radar.tsx`: radar circular SVG con anillos de distancia (10/25/50 km), blips por avión, barrido animado y tooltip HTML al hacer hover (callsign, altitud, velocidad, país de origen).
- Nuevo canal IPC `config:get-home-location` para compartir solo las coordenadas de casa con el renderer (sin exponer credenciales).
- Verificado en vivo con datos reales de OpenSky, incluyendo la corrección de dos bugs encontrados en la verificación manual (tooltip nativo poco fiable y tooltip que quedaba pegado en pantalla por comparación de estado por referencia en vez de por `icao24`).

## [0.2.0] — 2026-08-12

### Milestone 2 — Capa de datos OpenSky (proceso principal)

- `src/main/config.ts`: carga y valida `.env` (OAuth2, coordenadas de casa, bounding box, intervalo de polling) usando `dotenv`.
- `src/main/opensky.ts`: cliente OAuth2 client-credentials con cache/renovación de token, `fetchStates()` contra `/states/all` y `startPolling()` con reintento en 401 y backoff exponencial ante errores/429.
- IPC seguro main → renderer (`flights:update`) expuesto vía `contextBridge` (`window.api.onFlightsUpdate`), sin exponer el token/secret al renderer.
- Verificado con datos reales: aeronaves recibidas de OpenSky en ciclos consecutivos de polling cerca de Bernabéu/Barajas.

## [0.1.0] — 2026-08-12

### Milestone 1 — Setup del repo y estructura base

- Scaffolding inicial de Electron + Vite + React vía `electron-vite`: proceso principal (`src/main/`), preload con `contextBridge` (`src/preload/`) y renderer React (`src/renderer/src/`) con una ventana placeholder.
- `.gitignore` y `.env.example` para mantener las credenciales de OpenSky (`client_id`/`client_secret`) fuera del repositorio público.
- README con instrucciones de setup y `CLAUDE.md` con comandos y arquitectura para futuras sesiones de desarrollo asistido.
- Repo público creado en GitHub (`alzuno/flight-radar-widget`) con el primer push.
