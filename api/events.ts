import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { EventItem } from '../src/lib/types'

// Swappable event-source adapters. Eventbrite's public search was retired, so the
// only shipped adapter is Ticketmaster Discovery (free, keyword + lat/lng radius).
// To add a source later, write another adapter and push it into ADAPTERS.

type AdapterParams = { lat: number; lng: number; radiusKm: number; query: string }
type Adapter = { name: string; enabled: () => boolean; fetch: (p: AdapterParams) => Promise<EventItem[]> }

type TMEvent = {
  id?: string
  name?: string
  url?: string
  dates?: { start?: { dateTime?: string; localDate?: string } }
  _embedded?: {
    venues?: Array<{
      name?: string
      location?: { latitude?: string; longitude?: string }
    }>
  }
}

const ticketmaster: Adapter = {
  name: 'ticketmaster',
  enabled: () => Boolean(process.env.TICKETMASTER_KEY),
  async fetch({ lat, lng, radiusKm, query }) {
    const key = process.env.TICKETMASTER_KEY as string
    const url =
      'https://app.ticketmaster.com/discovery/v2/events.json' +
      `?apikey=${encodeURIComponent(key)}` +
      `&latlong=${lat},${lng}&radius=${Math.round(radiusKm)}&unit=km` +
      `&keyword=${encodeURIComponent(query)}&size=50&sort=date,asc`

    const r = await fetch(url)
    if (!r.ok) throw new Error(`ticketmaster ${r.status}`)
    const data = (await r.json()) as { _embedded?: { events?: TMEvent[] } }
    const events = data._embedded?.events ?? []

    return events
      .map((e): EventItem | null => {
        const venue = e._embedded?.venues?.[0]
        const vlat = Number(venue?.location?.latitude)
        const vlng = Number(venue?.location?.longitude)
        if (!Number.isFinite(vlat) || !Number.isFinite(vlng)) return null
        return {
          id: String(e.id ?? e.url ?? Math.random()),
          name: e.name ?? 'Untitled event',
          start: e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? '',
          venue: venue?.name ?? 'Venue not given',
          lat: vlat,
          lng: vlng,
          url: e.url ?? '',
          source: 'ticketmaster',
        }
      })
      .filter((x): x is EventItem => x !== null)
  },
}

const ADAPTERS: Adapter[] = [ticketmaster]

// GET /api/events?lat=&lng=&radius=&q=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Set your city to centre the map (missing coordinates).' })
  }
  const radiusKm = Math.min(500, Math.max(1, Number(req.query.radius) || 50))
  const query = String(req.query.q ?? 'architecture design urbanism').trim() || 'architecture'

  const active = ADAPTERS.filter((a) => a.enabled())
  if (active.length === 0) {
    return res
      .status(500)
      .json({ error: 'No events source configured. Add TICKETMASTER_KEY to your env.' })
  }

  // Try each source in order; first one with results wins.
  for (const adapter of active) {
    try {
      const events = await adapter.fetch({ lat, lng, radiusKm, query })
      if (events.length) {
        return res.status(200).json({ events, source: adapter.name })
      }
    } catch {
      /* try the next adapter */
    }
  }
  return res.status(200).json({ events: [], source: active[active.length - 1].name })
}
