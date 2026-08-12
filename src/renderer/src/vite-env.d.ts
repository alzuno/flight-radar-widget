/// <reference types="vite/client" />

import type { FlightState } from '../../shared/types'

export interface ExposedApi {
  onFlightsUpdate: (callback: (flights: FlightState[]) => void) => () => void
}

declare global {
  interface Window {
    api: ExposedApi
  }
}
