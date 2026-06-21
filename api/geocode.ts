import type { VercelRequest, VercelResponse } from '@vercel/node'

// Free geocoding via OpenStreetMap Nominatim (no key). Server-side so we can set a
// descriptive User-Agent per their usage policy and keep the browser calling /api only.
// GET /api/geocode?q=Sydney
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q ?? '').trim()
  if (!q) return res.status(400).json({ error: 'Provide a place to look up.' })

  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?q=${encodeURIComponent(q)}&format=json&limit=1`

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'career-strategy-planner/1.0 (workbench app)' },
    })
    if (!r.ok) return res.status(502).json({ error: "Couldn't look up that place." })
    const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) return res.status(404).json({ error: 'Place not found. Try a nearby city.' })
    const hit = data[0]
    return res.status(200).json({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name,
    })
  } catch {
    return res.status(502).json({ error: "Couldn't look up that place." })
  }
}
