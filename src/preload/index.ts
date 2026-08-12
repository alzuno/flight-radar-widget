import { contextBridge, ipcRenderer } from 'electron'
import type { FlightState } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  onFlightsUpdate(callback: (flights: FlightState[]) => void): () => void {
    const listener = (_event: unknown, flights: FlightState[]): void => callback(flights)
    ipcRenderer.on('flights:update', listener)
    return () => ipcRenderer.removeListener('flights:update', listener)
  }
})
