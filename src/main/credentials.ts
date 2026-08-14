import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { OpenSkyCredentials, SaveSettingsResult } from '../shared/types'

function credentialsPath(): string {
  return join(app.getPath('userData'), 'credentials.json')
}

/** Loads OpenSky credentials from `credentials.json`, falling back to `.env`
 * (dev convenience) and finally `null` if neither is set — that `null` is what
 * triggers the onboarding gate in the renderer. Never logged, never sent to the
 * renderer as-is. */
export function loadCredentials(): OpenSkyCredentials | null {
  const path = credentialsPath()
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8')) as OpenSkyCredentials
  }

  const clientId = process.env['OPENSKY_CLIENT_ID']
  const clientSecret = process.env['OPENSKY_CLIENT_SECRET']
  if (clientId && clientSecret) {
    return { clientId, clientSecret }
  }

  return null
}

export function saveCredentials(input: OpenSkyCredentials): SaveSettingsResult {
  if (!input.clientId.trim()) {
    return { ok: false, error: 'El Client ID no puede estar vacío.' }
  }
  if (!input.clientSecret.trim()) {
    return { ok: false, error: 'El Client Secret no puede estar vacío.' }
  }

  writeFileSync(credentialsPath(), JSON.stringify(input, null, 2), { mode: 0o600 })
  return { ok: true }
}
