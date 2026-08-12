/// <reference types="vite/client" />

import type { FlightState, HomeLocation } from '../../shared/types'

export interface ExposedApi {
  onFlightsUpdate: (callback: (flights: FlightState[]) => void) => () => void
  getHomeLocation: () => Promise<HomeLocation>
}

declare global {
  interface Window {
    api: ExposedApi
  }
}
