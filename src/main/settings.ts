import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppConfig } from './config'
import { distanceKm } from '../shared/geo'
import type { AppSettings } from '../shared/types'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/** Seed radius: the largest corner-to-home distance in the `.env` bbox, so a fresh
 * install keeps covering at least as much ground as the existing `.env` configuration. */
function seedBboxRadiusKm(config: AppConfig): number {
  const home = { latitude: config.homeLatitude, longitude: config.homeLongitude }
  const { lamin, lomin, lamax, lomax } = config.bbox
  const corners = [
    { latitude: lamin, longitude: lomin },
    { latitude: lamin, longitude: lomax },
    { latitude: lamax, longitude: lomin },
    { latitude: lamax, longitude: lomax }
  ]
  return Math.max(...corners.map((corner) => distanceKm(home, corner)))
}

function seedSettings(config: AppConfig): AppSettings {
  return {
    homeLatitude: config.homeLatitude,
    homeLongitude: config.homeLongitude,
    bboxRadiusKm: seedBboxRadiusKm(config),
    pollIntervalSeconds: config.pollIntervalSeconds
  }
}

/** Loads persisted settings, seeding (and persisting) them from `.env`-derived
 * defaults on first run. After the first run, `.env`'s HOME_/BBOX_/POLL_INTERVAL_SECONDS
 * vars are no longer consulted — this file becomes the source of truth for them. */
export function loadOrSeedSettings(config: AppConfig): AppSettings {
  const path = settingsPath()
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8')) as AppSettings
  }
  const settings = seedSettings(config)
  saveSettings(settings)
  return settings
}

export function saveSettings(settings: AppSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
}

export type ValidationResult =
  | { ok: true; settings: AppSettings }
  | { ok: false; error: string }

export function validateSettings(input: AppSettings): ValidationResult {
  if (!(input.homeLatitude >= -90 && input.homeLatitude <= 90)) {
    return { ok: false, error: 'La latitud debe estar entre -90 y 90.' }
  }
  if (!(input.homeLongitude >= -180 && input.homeLongitude <= 180)) {
    return { ok: false, error: 'La longitud debe estar entre -180 y 180.' }
  }
  if (!(input.bboxRadiusKm >= 5 && input.bboxRadiusKm <= 100)) {
    return { ok: false, error: 'El radio debe estar entre 5 y 100 km.' }
  }
  if (!(input.pollIntervalSeconds >= 10 && input.pollIntervalSeconds <= 300)) {
    return { ok: false, error: 'El intervalo de polling debe estar entre 10 y 300 segundos.' }
  }
  return { ok: true, settings: input }
}
