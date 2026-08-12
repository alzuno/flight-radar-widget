import type { AppConfig } from './config'
import type { FlightState } from '../shared/types'

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const STATES_URL = 'https://opensky-network.org/api/states/all'

// OpenSky tokens are valid for 30 min; refresh a bit early to avoid edge-case 401s.
const TOKEN_REFRESH_MARGIN_MS = 60_000

interface CachedToken {
  accessToken: string
  expiresAt: number
}

export class OpenSkyClient {
  private cachedToken: CachedToken | null = null

  constructor(private readonly config: AppConfig) {}

  private async fetchToken(): Promise<CachedToken> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.openSkyClientId,
      client_secret: this.config.openSkyClientSecret
    })

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!res.ok) {
      throw new Error(`OpenSky token request failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as { access_token: string; expires_in: number }
    return {
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000 - TOKEN_REFRESH_MARGIN_MS
    }
  }

  private async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken
    }
    this.cachedToken = await this.fetchToken()
    return this.cachedToken.accessToken
  }

  async fetchStates(): Promise<FlightState[]> {
    const { lamin, lomin, lamax, lomax } = this.config.bbox
    const query = new URLSearchParams({
      lamin: String(lamin),
      lomin: String(lomin),
      lamax: String(lamax),
      lomax: String(lomax)
    })

    const doFetch = async (token: string): Promise<Response> =>
      fetch(`${STATES_URL}?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

    let token = await this.getToken()
    let res = await doFetch(token)

    if (res.status === 401) {
      token = await this.getToken(true)
      res = await doFetch(token)
    }

    if (res.status === 429) {
      throw new Error('OpenSky rate limit hit (429)')
    }

    if (!res.ok) {
      throw new Error(`OpenSky /states/all request failed: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as { states: unknown[][] | null }
    return (json.states ?? []).map(parseState)
  }
}

function parseState(raw: unknown[]): FlightState {
  return {
    icao24: raw[0] as string,
    callsign: (raw[1] as string | null)?.trim() || null,
    originCountry: raw[2] as string,
    longitude: raw[5] as number | null,
    latitude: raw[6] as number | null,
    baroAltitude: raw[7] as number | null,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    onGround: raw[8] as boolean
  }
}

export type FlightsListener = (flights: FlightState[]) => void

export function startPolling(
  client: OpenSkyClient,
  intervalSeconds: number,
  onFlights: FlightsListener,
  onError: (err: unknown) => void
): () => void {
  let stopped = false
  let backoffMs = 0

  const tick = async (): Promise<void> => {
    if (stopped) return
    try {
      const flights = await client.fetchStates()
      backoffMs = 0
      onFlights(flights)
    } catch (err) {
      onError(err)
      backoffMs = backoffMs === 0 ? 30_000 : Math.min(backoffMs * 2, 5 * 60_000)
    } finally {
      if (!stopped) {
        setTimeout(tick, intervalSeconds * 1000 + backoffMs)
      }
    }
  }

  tick()

  return () => {
    stopped = true
  }
}
