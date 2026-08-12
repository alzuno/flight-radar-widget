import type React from 'react'
import { useState } from 'react'
import type { FlightState, HomeLocation } from '../../shared/types'
import { bearingDeg, distanceKm } from '../../shared/geo'
import './Radar.css'

interface RadarProps {
  home: HomeLocation
  flights: FlightState[]
}

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 140
const RING_DISTANCES_KM = [10, 25, 50]
const MAX_RANGE_KM = RING_DISTANCES_KM[RING_DISTANCES_KM.length - 1]

interface Blip {
  flight: FlightState
  x: number
  y: number
}

function toBlip(home: HomeLocation, flight: FlightState): Blip | null {
  if (flight.latitude === null || flight.longitude === null) return null

  const target = { latitude: flight.latitude, longitude: flight.longitude }
  const distance = Math.min(distanceKm(home, target), MAX_RANGE_KM)
  const bearing = bearingDeg(home, target)
  const radius = (distance / MAX_RANGE_KM) * RADIUS
  const angleRad = (bearing * Math.PI) / 180

  return {
    flight,
    x: CENTER + radius * Math.sin(angleRad),
    y: CENTER - radius * Math.cos(angleRad)
  }
}

function Radar({ home, flights }: RadarProps): React.JSX.Element {
  const [hoveredIcao24, setHoveredIcao24] = useState<string | null>(null)

  const blips = flights
    .map((flight) => toBlip(home, flight))
    .filter((blip): blip is Blip => blip !== null)

  const hovered = blips.find((blip) => blip.flight.icao24 === hoveredIcao24) ?? null

  return (
    <div className="radar-container" style={{ width: SIZE, height: SIZE }}>
      <svg className="radar" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle className="radar-background" cx={CENTER} cy={CENTER} r={RADIUS} />

        {RING_DISTANCES_KM.map((km) => (
          <circle
            key={km}
            className="radar-ring"
            cx={CENTER}
            cy={CENTER}
            r={(km / MAX_RANGE_KM) * RADIUS}
          />
        ))}

        {RING_DISTANCES_KM.map((km) => (
          <text
            key={km}
            className="radar-ring-label"
            x={CENTER + 4}
            y={CENTER - (km / MAX_RANGE_KM) * RADIUS}
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

        <circle className="radar-home" cx={CENTER} cy={CENTER} r={4} />

        {blips.map((blip) => (
          <circle
            key={blip.flight.icao24}
            className="radar-blip"
            cx={blip.x}
            cy={blip.y}
            r={5}
            onMouseEnter={() => setHoveredIcao24(blip.flight.icao24)}
            onMouseLeave={() =>
              setHoveredIcao24((current) => (current === blip.flight.icao24 ? null : current))
            }
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="radar-tooltip"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <div>{hovered.flight.callsign ?? '(sin callsign)'}</div>
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
