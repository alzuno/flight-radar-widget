# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Flight Radar Widget: a macOS desktop widget (Electron + Vite + React, via `electron-vite`) that shows nearby live aircraft (near Bernabéu/Barajas, Madrid) using the OpenSky Network REST API. See `PLAN.md` for the full execution plan and milestone checkpoints — check it before starting new work to see what's already done and what's next.

## Commands

- `npm run dev` — start the app in development (electron-vite dev server + Electron window).
- `npm run build` — production build via `electron-vite build`.

There is no test suite or linter configured yet.

**Sandbox note**: in this execution environment `ELECTRON_RUN_AS_NODE=1` is set, which makes the Electron binary run as plain Node instead of launching the app (causes `Cannot read properties of undefined (reading 'whenReady')`). Run dev/build with that variable unset, e.g. `env -u ELECTRON_RUN_AS_NODE npm run dev`.

## Architecture

Three-process Electron layout (`electron-vite` conventions):

- `src/main/` — main process. Owns app lifecycle/window creation now; per `PLAN.md` Milestone 2 this is where OpenSky OAuth2 token exchange and `/states/all` polling must live, since the OpenSky `client_secret` must never reach the renderer.
- `src/preload/` — preload script, the only bridge between main and renderer. Must use `contextBridge.exposeInMainWorld` to expose flight data to the renderer without leaking the OpenSky token/secret (never enable direct Node integration in the renderer for this).
- `src/renderer/src/` — React UI (radar view). `index.html` is the renderer entry, `main.tsx` mounts `App.tsx`.

Config: `electron.vite.config.ts` defines the three separate build targets (main/preload/renderer) and the `@renderer` path alias (`src/renderer/src`). Corresponding `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer) are referenced from the root `tsconfig.json`.

## Versioning workflow

- Commit and push every functional change (even sub-tasks within a milestone) — don't let large uncommitted/unpushed changes pile up.
- SemVer in `package.json`; create a git tag `vX.Y.Z` when a milestone closes.
- Commit messages must describe what was done and why — never generic ("wip", "changes").
- On closing a milestone: create the version tag AND add an entry to `CHANGELOG.md`. (Milestone 1 closed without this step being done — still pending as of this writing; don't repeat that gap for Milestone 2 onward.)

## Credentials and security

- OpenSky OAuth2 credentials live only in a local `.env` (git-ignored), read only by the main process — never expose them to the renderer, not even indirectly via devtools.
- `api/opensky_credentials.json` and `.env` are git-ignored; `.env.example` documents the required keys (OpenSky client id/secret, home lat/lon, bounding box, poll interval) with empty/placeholder values.
- This repo is public — any change touching credential handling must keep the secret exclusively in the main process.
- Since Milestone 5, user-editable runtime settings (home lat/lon, bbox radius, poll interval) persist in `settings.json` under `app.getPath('userData')` (`src/main/settings.ts`), separate from `.env`, which now only seeds that file on first run. `settings.json` never contains OpenSky credentials — only `.env` does.
