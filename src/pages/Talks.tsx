import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import eventsData from '../data/events.json'
import type { EventItem } from '../lib/types'
import './talks.css'

// Static, curated events (sourced from Eventbrite offline → no live API, no key,
// no runtime AI). Refresh by regenerating src/data/events.json.
const EVENTS = (eventsData as EventItem[])
  .slice()
  .sort((a, b) => a.start.localeCompare(b.start))

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'All events' },
  { key: 'walk', label: 'Walking tours' },
  { key: 'academic', label: 'Academic / CDRF' },
  { key: 'cpd', label: 'CPD / Workshop' },
  { key: 'tour', label: 'Tours' },
  { key: 'free', label: 'Free only' },
]

function matches(e: EventItem, cat: string): boolean {
  if (cat === 'all') return true
  if (cat === 'free') return e.free === true
  return e.category === cat
}

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

function FitBounds({ events }: { events: EventItem[] }) {
  const map = useMap()
  useEffect(() => {
    if (!events.length) return
    const bounds = L.latLngBounds(events.map((e) => [e.lat, e.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [events, map])
  return null
}

function FlyTo({ event }: { event: EventItem | null }) {
  const map = useMap()
  useEffect(() => {
    if (event) map.flyTo([event.lat, event.lng], 15, { duration: 0.6 })
  }, [event, map])
  return null
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date TBC'
  return d.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function Talks() {
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState<EventItem | null>(null)

  const filtered = useMemo(() => EVENTS.filter((e) => matches(e, cat)), [cat])
  const countFor = (key: string) => EVENTS.filter((e) => matches(e, key)).length

  return (
    <div className="container">
      <PageHead
        eyebrow="Local Talks Checker"
        title="Talks near your bench"
        lead="Architecture events around Sydney, on a free OpenStreetMap. Sourced from Eventbrite."
      />

      <div className="cat-filters">
        {CATEGORIES.map((c) => {
          const n = countFor(c.key)
          return (
            <button
              key={c.key}
              type="button"
              className={`cat-btn${cat === c.key ? ' is-active' : ''}`}
              onClick={() => {
                setCat(c.key)
                setSelected(null)
              }}
            >
              {c.label}
              <span className="cat-btn__count">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="talks-layout">
        <div className="talks-map">
          <MapContainer center={[-33.87, 151.21]} zoom={11} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds events={filtered} />
            <FlyTo event={selected} />
            {filtered.map((ev) => (
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
          {filtered.length === 0 ? (
            <Note title="No events in this filter">Pick another category.</Note>
          ) : (
            filtered.map((ev) => (
              <div
                key={ev.id}
                className={`talk-row${selected?.id === ev.id ? ' is-selected' : ''}`}
                onClick={() => setSelected(ev)}
              >
                <div className="talk-row__top">
                  <div className="talk-row__name">
                    {ev.name}
                    {ev.badge && <span className="talk-row__badge">{ev.badge}</span>}
                  </div>
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
                {ev.organizer && <div className="talk-row__meta">{ev.organizer}</div>}
                {ev.category && (
                  <span className="talk-row__cat">
                    {CATEGORIES.find((c) => c.key === ev.category)?.label ?? ev.category}
                  </span>
                )}
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  )
}
