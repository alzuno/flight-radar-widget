# Flight Radar Widget

Widget de escritorio para macOS que muestra en vivo los aviones cercanos a una ubicación configurada (por defecto, Madrid centro / Bernabéu, con foco en llegadas a Barajas), usando la [REST API de OpenSky Network](https://openskynetwork.github.io/opensky-api/rest.html).

Construido con Electron + Vite + React (`electron-vite`).

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa tus credenciales OAuth2 de OpenSky:

   ```bash
   cp .env.example .env
   ```

   El `.env` nunca se versiona (ver `.gitignore`).

3. Arranca en modo desarrollo:

   ```bash
   npm run dev
   ```

## Estructura

- `src/main/` — proceso principal de Electron (autenticación OpenSky, polling, ventana).
- `src/preload/` — script de preload (puente seguro `contextBridge` entre main y renderer).
- `src/renderer/` — interfaz React del radar.

## Seguridad

Las credenciales de OpenSky (`client_id`/`client_secret`) se leen únicamente en el proceso principal de Electron y nunca se exponen al renderer ni a devtools.
