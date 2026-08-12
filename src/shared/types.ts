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
