# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/), versionado con [SemVer](https://semver.org/).

## [0.1.0] — 2026-08-12

### Milestone 1 — Setup del repo y estructura base

- Scaffolding inicial de Electron + Vite + React vía `electron-vite`: proceso principal (`src/main/`), preload con `contextBridge` (`src/preload/`) y renderer React (`src/renderer/src/`) con una ventana placeholder.
- `.gitignore` y `.env.example` para mantener las credenciales de OpenSky (`client_id`/`client_secret`) fuera del repositorio público.
- README con instrucciones de setup y `CLAUDE.md` con comandos y arquitectura para futuras sesiones de desarrollo asistido.
- Repo público creado en GitHub (`alzuno/flight-radar-widget`) con el primer push.
