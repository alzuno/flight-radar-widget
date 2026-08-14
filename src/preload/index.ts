import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  FlightState,
  OpenSkyCredentials,
  SaveSettingsResult
} from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  onFlightsUpdate(callback: (flights: FlightState[]) => void): () => void {
    const listener = (_event: unknown, flights: FlightState[]): void => callback(flights)
    ipcRenderer.on('flights:update', listener)
    return () => ipcRenderer.removeListener('flights:update', listener)
  },
  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke('settings:get')
  },
  saveSettings(settings: AppSettings): Promise<SaveSettingsResult> {
    return ipcRenderer.invoke('settings:save', settings)
  },
  onSettingsUpdated(callback: (settings: AppSettings) => void): () => void {
    const listener = (_event: unknown, settings: AppSettings): void => callback(settings)
    ipcRenderer.on('settings:updated', listener)
    return () => ipcRenderer.removeListener('settings:updated', listener)
  },
  onSettingsOpenRequest(callback: () => void): () => void {
    const listener = (): void => callback()
    ipcRenderer.on('settings:open-request', listener)
    return () => ipcRenderer.removeListener('settings:open-request', listener)
  },
  hasCredentials(): Promise<boolean> {
    return ipcRenderer.invoke('credentials:has')
  },
  saveCredentials(credentials: OpenSkyCredentials): Promise<SaveSettingsResult> {
    return ipcRenderer.invoke('credentials:save', credentials)
  }
})
