export interface FlightState {
  icao24: string
  callsign: string | null
  originCountry: string
  longitude: number | null
  latitude: number | null
  baroAltitude: number | null
  velocity: number | null
  trueTrack: number | null
  onGround: boolean
}

export interface HomeLocation {
  latitude: number
  longitude: number
}

export interface AppSettings {
  homeLatitude: number
  homeLongitude: number
  bboxRadiusKm: number
  pollIntervalSeconds: number
}

export type SaveSettingsResult = { ok: true } | { ok: false; error: string }
