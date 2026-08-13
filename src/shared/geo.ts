import type { HomeLocation } from './types'

const EARTH_RADIUS_KM = 6371
const KM_PER_DEGREE_LAT = 111

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two points, in kilometers. */
export function distanceKm(from: HomeLocation, to: HomeLocation): number {
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/** Initial bearing from `from` to `to`, in degrees clockwise from north (0-360). */
export function bearingDeg(from: HomeLocation, to: HomeLocation): number {
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

export interface Bbox {
  lamin: number
  lomin: number
  lamax: number
  lomax: number
}

/** Bounding box of `radiusKm` around `home`, approximating a circle with a square. */
export function radiusKmToBbox(home: HomeLocation, radiusKm: number): Bbox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT
  const lonDelta = radiusKm / (KM_PER_DEGREE_LAT * Math.cos(toRadians(home.latitude)))

  return {
    lamin: home.latitude - latDelta,
    lomin: home.longitude - lonDelta,
    lamax: home.latitude + latDelta,
    lomax: home.longitude + lonDelta
  }
}
