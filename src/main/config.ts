import { config as loadDotenv } from 'dotenv'
import type { Bbox } from '../shared/geo'

loadDotenv()

function envOrFloat(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const value = Number(raw)
  return Number.isNaN(value) ? fallback : value
}

export interface AppConfig {
  homeLatitude: number
  homeLongitude: number
  bbox: Bbox
  pollIntervalSeconds: number
}

/** Only used to seed `settings.json` on first run (see `src/main/settings.ts`) —
 * never throws, since a packaged install has no `.env` at all. Defaults match
 * `.env.example` (Barajas, Madrid). OpenSky credentials live in `src/main/credentials.ts`,
 * not here. */
export function loadConfig(): AppConfig {
  return {
    homeLatitude: envOrFloat('HOME_LATITUDE', 40.4719),
    homeLongitude: envOrFloat('HOME_LONGITUDE', -3.5626),
    bbox: {
      lamin: envOrFloat('BBOX_LAMIN', 40.15),
      lomin: envOrFloat('BBOX_LOMIN', -3.98),
      lamax: envOrFloat('BBOX_LAMAX', 40.8),
      lomax: envOrFloat('BBOX_LOMAX', -3.15)
    },
    pollIntervalSeconds: envOrFloat('POLL_INTERVAL_SECONDS', 25)
  }
}
