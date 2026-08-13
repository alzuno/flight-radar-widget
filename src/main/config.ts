import { config as loadDotenv } from 'dotenv'
import type { Bbox } from '../shared/geo'

loadDotenv()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function requireEnvFloat(name: string): number {
  const value = Number(requireEnv(name))
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`)
  }
  return value
}

export interface AppConfig {
  openSkyClientId: string
  openSkyClientSecret: string
  homeLatitude: number
  homeLongitude: number
  bbox: Bbox
  pollIntervalSeconds: number
}

export function loadConfig(): AppConfig {
  return {
    openSkyClientId: requireEnv('OPENSKY_CLIENT_ID'),
    openSkyClientSecret: requireEnv('OPENSKY_CLIENT_SECRET'),
    homeLatitude: requireEnvFloat('HOME_LATITUDE'),
    homeLongitude: requireEnvFloat('HOME_LONGITUDE'),
    bbox: {
      lamin: requireEnvFloat('BBOX_LAMIN'),
      lomin: requireEnvFloat('BBOX_LOMIN'),
      lamax: requireEnvFloat('BBOX_LAMAX'),
      lomax: requireEnvFloat('BBOX_LOMAX')
    },
    pollIntervalSeconds: requireEnvFloat('POLL_INTERVAL_SECONDS')
  }
}
