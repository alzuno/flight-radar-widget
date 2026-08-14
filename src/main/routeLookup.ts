import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ADSBDB_URL = 'https://api.adsbdb.com/v0/callsign'

// Positive routes rarely change within the same day; negative results (private/
// military/unknown callsigns) get a much shorter TTL so they're retried occasionally
// without hammering adsbdb.com on every ~25s poll tick.
const POSITIVE_TTL_MS = 12 * 60 * 60 * 1000
const NEGATIVE_TTL_MS = 30 * 60 * 1000
const FETCH_TIMEOUT_MS = 5_000
const MAX_CONCURRENT_LOOKUPS = 4

interface CacheEntry {
  route: string | null
  fetchedAt: number
}

interface AdsbdbResponse {
  response:
    | 'unknown callsign'
    | {
        flightroute?: {
          origin?: { iata_code?: string }
          destination?: { iata_code?: string }
        }
      }
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Set<string>()

function normalize(callsign: string): string {
  return callsign.trim().toUpperCase()
}

function cachePath(): string {
  return join(app.getPath('userData'), 'routes-cache.json')
}

/** Loads the persisted route cache from disk. Call once at startup. Tolerates a
 * missing or corrupt file by starting with an empty cache. */
export function loadRouteCache(): void {
  const path = cachePath()
  if (!existsSync(path)) return
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, CacheEntry>
    for (const [key, entry] of Object.entries(raw)) {
      cache.set(key, entry)
    }
  } catch (err) {
    console.error('[routeLookup] no se pudo leer routes-cache.json, se ignora:', err)
  }
}

function persistRouteCache(): void {
  writeFileSync(cachePath(), JSON.stringify(Object.fromEntries(cache)), 'utf-8')
}

/** Synchronous, cache-only lookup — never performs network I/O. Returns
 * `undefined` when the callsign hasn't been resolved yet or its cache entry expired. */
export function getCachedRoute(callsign: string): string | null | undefined {
  const entry = cache.get(normalize(callsign))
  if (!entry) return undefined
  const ttl = entry.route === null ? NEGATIVE_TTL_MS : POSITIVE_TTL_MS
  if (Date.now() - entry.fetchedAt > ttl) return undefined
  return entry.route
}

async function fetchRoute(callsign: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${ADSBDB_URL}/${encodeURIComponent(normalize(callsign))}`, {
      signal: controller.signal
    })
    if (!res.ok) return null

    const json = (await res.json()) as AdsbdbResponse
    if (json.response === 'unknown callsign') return null

    const origin = json.response.flightroute?.origin?.iata_code
    const destination = json.response.flightroute?.destination?.iata_code
    if (!origin || !destination) return null

    return `${origin}-${destination}`
  } catch (err) {
    console.error(`[routeLookup] fallo al consultar adsbdb.com para ${callsign}:`, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Fire-and-forget: queues background lookups (capped concurrency, deduped
 * against in-flight requests) for any callsigns not already cached/fresh, and
 * calls `onResolved` per completed lookup so the caller can push an update. */
export function refreshRoutesInBackground(
  callsigns: string[],
  onResolved: (callsign: string, route: string | null) => void
): void {
  const stale = [...new Set(callsigns.map(normalize))].filter(
    (key) => getCachedRoute(key) === undefined && !inFlight.has(key)
  )

  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < stale.length) {
      const key = stale[cursor++]
      inFlight.add(key)
      try {
        const route = await fetchRoute(key)
        cache.set(key, { route, fetchedAt: Date.now() })
        persistRouteCache()
        onResolved(key, route)
      } finally {
        inFlight.delete(key)
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_LOOKUPS, stale.length)
  for (let i = 0; i < workerCount; i++) {
    void worker()
  }
}
