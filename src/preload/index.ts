import { contextBridge, ipcRenderer } from 'electron'
import type { FlightState, HomeLocation } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  onFlightsUpdate(callback: (flights: FlightState[]) => void): () => void {
    const listener = (_event: unknown, flights: FlightState[]): void => callback(flights)
    ipcRenderer.on('flights:update', listener)
    return () => ipcRenderer.removeListener('flights:update', listener)
  },
  getHomeLocation(): Promise<HomeLocation> {
    return ipcRenderer.invoke('config:get-home-location')
  }
})
