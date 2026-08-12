# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/), versionado con [SemVer](https://semver.org/).

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
