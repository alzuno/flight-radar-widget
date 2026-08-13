/// <reference types="vite/client" />

import type { AppSettings, FlightState, SaveSettingsResult } from '../../shared/types'

export interface ExposedApi {
  onFlightsUpdate: (callback: (flights: FlightState[]) => void) => () => void
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<SaveSettingsResult>
  onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void
  onSettingsOpenRequest: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: ExposedApi
  }
}
