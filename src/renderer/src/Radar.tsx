import type React from 'react'
import { useEffect, useState } from 'react'
import type { FlightState, HomeLocation } from '../../shared/types'
import { bearingDeg, distanceKm } from '../../shared/geo'
import { NEARBY_AIRPORTS } from '../../shared/airports'
import './Radar.css'

interface RadarProps {
  home: HomeLocation
  flights: FlightState[]
  pollIntervalSeconds: number
}

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 140
const ZOOM_LEVELS = [
  [3, 6, 10],
  [6, 12, 18],
  [10, 20, 30]
]
const TRAIL_LENGTH = 10
// Keep a plane's trail for ~5 minutes after it stops being reported, regardless
// of the configured poll interval, with a floor so fast polling doesn't make
// trails vanish almost instantly.
const TRAIL_RETENTION_SECONDS = 300

interface Point {
  x: number
  y: number
}

interface TrailEntry {
  points: Point[]
  missedCycles: number
}

interface Blip {
  flight: FlightState
  x: number
  y: number
}

function projectAt(
  home: HomeLocation,
  target: HomeLocation,
  distance: number,
  maxRangeKm: number
): Point {
  const bearing = bearingDeg(home, target)
  const radius = (distance / maxRangeKm) * RADIUS
  const angleRad = (bearing * Math.PI) / 180

  return {
    x: CENTER + radius * Math.sin(angleRad),
    y: CENTER - radius * Math.cos(angleRad)
  }
}

/** Projects a point, or null if it falls outside the radar's range. */
function projectInRange(home: HomeLocation, target: HomeLocation, maxRangeKm: number): Point | null {
  const distance = distanceKm(home, target)
  return distance > maxRangeKm ? null : projectAt(home, target, distance, maxRangeKm)
}

function toBlip(home: HomeLocation, flight: FlightState, maxRangeKm: number): Blip | null {
  if (flight.latitude === null || flight.longitude === null) return null

  const target = { latitude: flight.latitude, longitude: flight.longitude }
  const point = projectInRange(home, target, maxRangeKm)
  return point ? { flight, ...point } : null
}

function Radar({ home, flights, pollIntervalSeconds }: RadarProps): React.JSX.Element {
  const [hoveredIcao24, setHoveredIcao24] = useState<string | null>(null)
  const [history, setHistory] = useState<Map<string, TrailEntry>>(new Map())
  const [zoomIndex, setZoomIndex] = useState(0)

  const maxMissedCycles = Math.max(3, Math.round(TRAIL_RETENTION_SECONDS / pollIntervalSeconds))

  const ringDistancesKm = ZOOM_LEVELS[zoomIndex]
  const maxRangeKm = ringDistancesKm[ringDistancesKm.length - 1]

  const changeZoom = (delta: number): void => {
    setZoomIndex((current) => {
      const next = Math.min(Math.max(current + delta, 0), ZOOM_LEVELS.length - 1)
      if (next !== current) setHistory(new Map())
      return next
    })
  }

  const airborneFlights = flights.filter((flight) => !flight.onGround)

  const blips = airborneFlights
    .map((flight) => toBlip(home, flight, maxRangeKm))
    .filter((blip): blip is Blip => blip !== null)

  const hovered = blips.find((blip) => blip.flight.icao24 === hoveredIcao24) ?? null

  useEffect(() => {
    setHistory((prev) => {
      const next = new Map(prev)
      const seen = new Set<string>()

      for (const blip of blips) {
        seen.add(blip.flight.icao24)
        const points = [...(next.get(blip.flight.icao24)?.points ?? []), { x: blip.x, y: blip.y }]
        next.set(blip.flight.icao24, { points: points.slice(-TRAIL_LENGTH), missedCycles: 0 })
      }

      // OpenSky's free feed sometimes omits an aircraft for a cycle or two
      // even though it's still around — keep its trail for a few missed
      // polls before giving up on it, instead of wiping it on the first miss.
      for (const [icao24, entry] of next) {
        if (seen.has(icao24)) continue
        if (entry.missedCycles + 1 > maxMissedCycles) {
          next.delete(icao24)
        } else {
          next.set(icao24, { ...entry, missedCycles: entry.missedCycles + 1 })
        }
      }

      return next
    })
    // Only re-run when a new polling cycle produces a new `flights` array —
    // not on every re-render (e.g. hover state changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights])

  const airportBlips = NEARBY_AIRPORTS.filter((airport) => distanceKm(home, airport) > 0.5)
    .map((airport) => ({
      airport,
      point: projectInRange(home, airport, maxRangeKm)
    }))
    .filter(
      (entry): entry is { airport: (typeof NEARBY_AIRPORTS)[number]; point: Point } =>
        entry.point !== null
    )

  return (
    <div className="radar-container" style={{ width: SIZE, height: SIZE }}>
      <svg className="radar" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle className="radar-background" cx={CENTER} cy={CENTER} r={RADIUS} />

        {ringDistancesKm.map((km) => (
          <circle
            key={km}
            className="radar-ring"
            cx={CENTER}
            cy={CENTER}
            r={(km / maxRangeKm) * RADIUS}
          />
        ))}

        {ringDistancesKm.map((km) => (
          <text
            key={km}
            className="radar-ring-label"
            x={CENTER + 4}
            y={CENTER - (km / maxRangeKm) * RADIUS}
          >
            {km} km
          </text>
        ))}

        <g className="radar-sweep" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${
              CENTER + RADIUS * Math.sin(0.3)
            } ${CENTER - RADIUS * Math.cos(0.3)} Z`}
          />
        </g>

        {airportBlips.map(({ airport, point }) => (
          <g key={airport.code}>
            <rect
              className="radar-airport"
              x={point.x - 4}
              y={point.y - 4}
              width={8}
              height={8}
              transform={`rotate(45 ${point.x} ${point.y})`}
            />
            <text className="radar-airport-label" x={point.x + 7} y={point.y + 3}>
              {airport.code}
            </text>
          </g>
        ))}

        <circle className="radar-home" cx={CENTER} cy={CENTER} r={4} />

        {blips.map((blip) => {
          const points = history.get(blip.flight.icao24)?.points ?? []
          if (points.length < 2) return null

          return (
            <g key={`trail-${blip.flight.icao24}`}>
              {points.slice(1).map((point, i) => {
                const prev = points[i]
                const age = i / Math.max(points.length - 2, 1)
                return (
                  <line
                    key={i}
                    className="radar-trail-segment"
                    x1={prev.x}
                    y1={prev.y}
                    x2={point.x}
                    y2={point.y}
                    style={{ opacity: 0.15 + age * 0.35 }}
                  />
                )
              })}
            </g>
          )
        })}

        {blips.map((blip) => (
          <g key={blip.flight.icao24}>
            <circle
              className="radar-blip"
              cx={blip.x}
              cy={blip.y}
              r={5}
              onMouseEnter={() => setHoveredIcao24(blip.flight.icao24)}
              onMouseLeave={() =>
                setHoveredIcao24((current) => (current === blip.flight.icao24 ? null : current))
              }
            />
            <text className="radar-label" x={blip.x + 8} y={blip.y - 8}>
              {blip.flight.callsign?.trim() || blip.flight.icao24}
            </text>
            {blip.flight.route && (
              <text className="radar-route-label" x={blip.x + 8} y={blip.y + 2}>
                {blip.flight.route.origin}-{blip.flight.route.destination}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="radar-zoom-controls">
        <button
          type="button"
          className="radar-zoom-button"
          onClick={() => changeZoom(-1)}
          disabled={zoomIndex === 0}
          aria-label="Acercar radar"
        >
          +
        </button>
        <button
          type="button"
          className="radar-zoom-button"
          onClick={() => changeZoom(1)}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          aria-label="Alejar radar"
        >
          −
        </button>
      </div>

      {hovered && (
        <div className="radar-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          <div>{hovered.flight.callsign ?? '(sin callsign)'}</div>
          <div>
            Ruta:{' '}
            {hovered.flight.route
              ? `${hovered.flight.route.origin}-${hovered.flight.route.destination}`
              : '—'}
          </div>
          {hovered.flight.route?.originCity && hovered.flight.route?.destinationCity && (
            <div>
              {hovered.flight.route.originCity} → {hovered.flight.route.destinationCity}
            </div>
          )}
          <div>
            Altitud:{' '}
            {hovered.flight.baroAltitude !== null
              ? `${Math.round(hovered.flight.baroAltitude)} m`
              : '—'}
          </div>
          <div>
            Velocidad:{' '}
            {hovered.flight.velocity !== null
              ? `${Math.round(hovered.flight.velocity * 3.6)} km/h`
              : '—'}
          </div>
          <div>Origen: {hovered.flight.originCountry}</div>
        </div>
      )}
    </div>
  )
}

export default Radar
