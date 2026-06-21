import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { Button, LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { ApiError, fetchEvents, geocode } from '../lib/api'
import { loadProfile } from '../lib/storage'
import type { EventItem } from '../lib/types'
import './talks.css'

// Sydney — default centre when no profile city is set.
const DEFAULT_CENTRE = { lat: -33.8688, lng: 151.2093, label: 'Sydney, Australia' }

const RUST_PIN = L.divIcon({
  className: 'rust-pin',
  html:
    '<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="#B5512E" stroke="#2C2A24" stroke-width="1.5"/>' +
    '<circle cx="11" cy="11" r="4" fill="#FBE9DF"/></svg>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
})

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng])
  }, [lat, lng, map])
  return null
}

function FlyTo({ event }: { event: EventItem | null }) {
  const map = useMap()
  useEffect(() => {
    if (event) map.flyTo([event.lat, event.lng], 14, { duration: 0.6 })
  }, [event, map])
  return null
}

function formatWhen(iso: string): string {
  if (!iso) return 'Date TBC'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date TBC'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Talks() {
  const [centre, setCentre] = useState(DEFAULT_CENTRE)
  const [term, setTerm] = useState('architecture design urbanism')
  const [appliedTerm, setAppliedTerm] = useState('architecture design urbanism')
  const [radius, setRadius] = useState(50)
  const [events, setEvents] = useState<EventItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EventItem | null>(null)

  // Centre on the profile city if one is set.
  useEffect(() => {
    const city = loadProfile()?.city
    if (!city) return
    let live = true
    geocode(city)
      .then((g) => live && setCentre(g))
      .catch(() => {
        /* keep default centre */
      })
    return () => {
      live = false
    }
  }, [])

  // Fetch events on centre / radius / term change.
  useEffect(() => {
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    setError('')
    fetchEvents({ lat: centre.lat, lng: centre.lng, radius, q: appliedTerm })
      .then((res) => {
        if (!live) return
        setEvents(res.events)
        setStatus(res.events.length ? 'ready' : 'empty')
      })
      .catch((err: unknown) => {
        if (!live) return
        setError(err instanceof ApiError ? err.message : 'Could not load events.')
        setStatus('error')
      })
    return () => {
      live = false
    }
  }, [centre, radius, appliedTerm])

  const hasProfile = useMemo(() => Boolean(loadProfile()?.city), [])

  return (
    <div className="container">
      <PageHead
        eyebrow="Local Talks Checker"
        title="Talks near your bench"
        lead={`Architecture events around ${centre.label.split(',')[0]}, on a free OpenStreetMap.`}
      />

      <form
        className="talks-controls"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedTerm(term.trim() || 'architecture')
        }}
      >
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          <span className="field__label">Search</span>
          <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Radius</span>
          <select
            className="select"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={250}>250 km</option>
          </select>
        </label>
        <Button type="submit" arrow>
          Search
        </Button>
      </form>

      {!hasProfile && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Note title="Centred on Sydney">
            Set your city in your profile to centre the map where you are.
          </Note>
        </div>
      )}

      <div className="talks-layout">
        <div className="talks-map">
          <MapContainer center={[centre.lat, centre.lng]} zoom={11} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Recenter lat={centre.lat} lng={centre.lng} />
            <FlyTo event={selected} />
            {events.map((ev) => (
              <Marker
                key={ev.id}
                position={[ev.lat, ev.lng]}
                icon={RUST_PIN}
                eventHandlers={{ click: () => setSelected(ev) }}
              >
                <Popup>
                  <div className="talk-popup__name">{ev.name}</div>
                  <div className="talk-popup__meta">
                    {formatWhen(ev.start)} · {ev.venue}
                  </div>
                  {ev.url && (
                    <LinkButton href={ev.url} variant="secondary" arrow>
                      Details
                    </LinkButton>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="talks-list">
          {status === 'loading' && <Note title="Locating talks…">Reading nearby events.</Note>}
          {status === 'error' && (
            <Note title="No answer from the events board" variant="error">
              {error}
            </Note>
          )}
          {status === 'empty' && (
            <Note title="No talks found nearby">Widen the radius or change the search.</Note>
          )}
          {status === 'ready' &&
            events.map((ev) => (
              <div
                key={ev.id}
                className={`talk-row${selected?.id === ev.id ? ' is-selected' : ''}`}
                onClick={() => setSelected(ev)}
              >
                <div className="talk-row__top">
                  <div className="talk-row__name">{ev.name}</div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <PinButton
                      item={{
                        id: ev.id,
                        kind: 'talk',
                        title: ev.name,
                        subtitle: ev.venue,
                        url: ev.url,
                        meta: formatWhen(ev.start),
                      }}
                    />
                  </span>
                </div>
                <div className="talk-row__meta">
                  {formatWhen(ev.start)} · {ev.venue}
                </div>
              </div>
            ))}
        </aside>
      </div>
    </div>
  )
}
