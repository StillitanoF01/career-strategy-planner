import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import eventsData from '../data/events.json'
import type { EventItem } from '../lib/types'
import './talks.css'

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

const STAGE_PER_PAGE = 6

function matches(e: EventItem, cat: string): boolean {
  if (cat === 'all') return true
  if (cat === 'free') return e.free === true
  return e.category === cat
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDate()
  const mon = d.toLocaleString('en-AU', { month: 'short' }).slice(0, 3).toUpperCase()
  return `${day} ${mon}`
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

// Exact palette from design spec
const PAL = {
  bg:       '#E3D7C6',
  land:     '#D2C2AD',
  landAlt:  '#C7B49C',
  water:    '#D9CABA',
  road:     '#8A725D',
  roadMaj:  '#6B5544',
  label:    '#5E4B3D',
}

function applyPalette(map: maplibregl.Map) {
  map.getStyle().layers.forEach((layer) => {
    const id = layer.id
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', PAL.bg)
      } else if (layer.type === 'fill') {
        if (/water|ocean|sea|lake|river|bay|reservoir/.test(id)) {
          map.setPaintProperty(id, 'fill-color', PAL.water)
        } else if (/park|grass|wood|forest|green|landcover|scrub|sand|beach|glacier/.test(id)) {
          map.setPaintProperty(id, 'fill-color', PAL.landAlt)
        } else if (/building/.test(id)) {
          map.setPaintProperty(id, 'fill-color', PAL.landAlt)
          try { map.setPaintProperty(id, 'fill-outline-color', '#B9A992') } catch { /* skip */ }
        } else {
          map.setPaintProperty(id, 'fill-color', PAL.land)
        }
      } else if (layer.type === 'line') {
        if (/water|river|stream|canal|waterway/.test(id)) {
          map.setPaintProperty(id, 'line-color', PAL.water)
        } else if (/motorway|trunk|primary|expressway/.test(id)) {
          map.setPaintProperty(id, 'line-color', PAL.roadMaj)
        } else if (/boundary|admin/.test(id)) {
          map.setPaintProperty(id, 'line-color', '#B9A992')
        } else {
          map.setPaintProperty(id, 'line-color', PAL.road)
        }
      } else if (layer.type === 'symbol') {
        const isShield = /shield|number|ref/.test(id)
        const textCol = isShield ? PAL.roadMaj : PAL.label
        const iconCol = isShield ? PAL.roadMaj : PAL.label
        try { map.setPaintProperty(id, 'text-color', textCol) } catch { /* skip */ }
        try { map.setPaintProperty(id, 'text-halo-color', PAL.bg) } catch { /* skip */ }
        try { map.setPaintProperty(id, 'icon-color', iconCol) } catch { /* skip */ }
      }
    } catch { /* skip layers that don't support a given paint property */ }
  })
}

const PIN_SVG =
  '<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="#B5512E" stroke="#2C2A24" stroke-width="1.5"/>' +
  '<circle cx="11" cy="11" r="4" fill="#FBE9DF"/></svg>'

interface TalksMapProps {
  events: EventItem[]
  selected: EventItem | null
  onSelect: (ev: EventItem) => void
}

function TalksMap({ events, selected, onSelect }: TalksMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const markerMapRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const [mapReady, setMapReady] = useState(false)

  // Stable callback ref so marker listeners don't go stale
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [151.21, -33.87],
      zoom: 11,
      attributionControl: false,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    // MapLibre calls canvas.focus() at the end of flyTo, which scrolls the page.
    // Override it to always use preventScroll so the viewport stays put.
    const canvas = map.getCanvas()
    const origFocus = canvas.focus.bind(canvas)
    canvas.focus = (opts?: FocusOptions) => origFocus({ ...opts, preventScroll: true })

    map.on('load', () => {
      applyPalette(map)
      setMapReady(true)
    })
    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Rebuild markers whenever events change (or map becomes ready)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    markerMapRef.current.clear()
    if (!events.length) return

    const bounds = new maplibregl.LngLatBounds()
    events.forEach((ev) => bounds.extend([ev.lng, ev.lat]))
    map.fitBounds(bounds, { padding: 40, maxZoom: 14 })

    events.forEach((ev) => {
      const el = document.createElement('div')
      el.innerHTML = PIN_SVG
      el.style.cssText = 'width:22px;height:30px;cursor:pointer'

      const popup = new maplibregl.Popup({ offset: [0, -28], closeButton: false, focusAfterOpen: false })
        .setHTML(
          `<div class="talk-popup__name">${ev.name}</div>` +
          `<div class="talk-popup__meta">${formatWhen(ev.start)} · ${ev.venue}</div>` +
          (ev.url ? `<a href="${ev.url}" target="_blank" rel="noopener noreferrer" class="talk-popup__link">Details →</a>` : '')
        )

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([ev.lng, ev.lat])
        .setPopup(popup)
        .addTo(map)

      el.addEventListener('click', (e) => { e.stopPropagation(); onSelectRef.current(ev) })
      markersRef.current.push(marker)
      markerMapRef.current.set(ev.id, marker)
    })
  }, [events, mapReady])

  // Close all open popups
  const closeAllPopups = useCallback(() => {
    markerMapRef.current.forEach((m) => {
      if (m.getPopup().isOpen()) m.togglePopup()
    })
  }, [])

  // Close popups on bare map click
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.on('click', closeAllPopups)
    return () => { map.off('click', closeAllPopups) }
  }, [mapReady, closeAllPopups])

  // Fly to selected and open its popup
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !selected) return
    const zoom = Math.max(map.getZoom(), 14)
    map.flyTo({ center: [selected.lng, selected.lat], zoom, duration: 600 })
    closeAllPopups()
    const marker = markerMapRef.current.get(selected.id)
    if (marker) marker.togglePopup()
  }, [selected, mapReady, closeAllPopups])

  return <div ref={containerRef} className="talks-map-gl" />
}

export function Talks() {
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [eventsPage, setEventsPage] = useState(1)

  const filtered = useMemo(() => EVENTS.filter((e) => matches(e, cat)), [cat])
  const countFor = (key: string) => EVENTS.filter((e) => matches(e, key)).length

  const totalStagePages = Math.max(1, Math.ceil(filtered.length / STAGE_PER_PAGE))
  const stageVisible = filtered.slice((eventsPage - 1) * STAGE_PER_PAGE, eventsPage * STAGE_PER_PAGE)

  useEffect(() => { setEventsPage(1) }, [cat])

  const handleSelect = useCallback((ev: EventItem) => setSelected(ev), [])

  useEffect(() => {
    const deselect = () => setSelected(null)
    document.addEventListener('click', deselect)
    return () => document.removeEventListener('click', deselect)
  }, [])

  return (
    <div className="talks-wrap">

      {/* ---- Photo stage (wide screens) ---- */}
      <div className="talks-stage" role="region" aria-label="Local Talks Checker">

        {/* Left page — header */}
        <div className="talks-stage__layer talks-stage__head">
          <div className="talks-stage__head-text">
            <span className="talks-stage__eyebrow">Local Talks Checker</span>
            <h1 className="talks-stage__title">Talks near<br />your bench</h1>
            <p className="talks-stage__lead">Architecture events around Sydney.</p>
          </div>
        </div>

        {/* Left page — map */}
        <div className="talks-stage__layer talks-stage__map">
          <TalksMap events={filtered} selected={selected} onSelect={handleSelect} />
        </div>

        {/* Right page — filters + event cards */}
        <div className="talks-stage__layer talks-stage__sidebar">

          <div className="talks-stage__filters">
            <div className="talks-stage__panel-head">Filter by type</div>
            <div className="talks-stage__pills">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`talks-stage__pill${cat === c.key ? ' talks-stage__pill--active' : ''}`}
                  onClick={() => { setCat(c.key); setSelected(null) }}
                >
                  {c.label}
                  <span className="talks-stage__pill-count">{countFor(c.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="talks-stage__events">
            <div className="talks-stage__panel-head">
              <span>{filtered.length === 0 ? 'No events' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}</span>
              {totalStagePages > 1 && (
                <div className="talks-stage__pager">
                  <button className="talks-stage__pager-btn" disabled={eventsPage <= 1} onClick={() => setEventsPage((p) => Math.max(1, p - 1))}>← Prev</button>
                  <span className="talks-stage__pager-info">{eventsPage} / {totalStagePages}</span>
                  <button className="talks-stage__pager-btn" disabled={eventsPage >= totalStagePages} onClick={() => setEventsPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="talks-stage__msg">No events match this filter.</p>
            ) : (
              <div className="talks-stage__grid">
                {stageVisible.map((ev) => (
                  <div
                    key={ev.id}
                    className={`talks-stage__card${selected?.id === ev.id ? ' is-selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                  >
                    {ev.badge && <span className="talks-stage__card-badge">{ev.badge}</span>}
                    <div className="talks-stage__card-label">
                      {ev.category ? (CATEGORIES.find((c) => c.key === ev.category)?.label ?? ev.category) : 'Event'}
                    </div>
                    <div className="talks-stage__card-name">{ev.name}</div>
                    <div className="talks-stage__card-body">
                      <div className="talks-stage__card-meta">{formatWhen(ev.start)}</div>
                      <div className="talks-stage__card-meta">{ev.venue}</div>
                    </div>
                    <div className="talks-stage__card-foot" onClick={(e) => e.stopPropagation()}>
                      <span className="talks-stage__card-date">{formatShortDate(ev.start)}</span>
                      <div className="talks-stage__card-actions">
                        <PinButton item={{ id: ev.id, kind: 'talk', title: ev.name, subtitle: ev.venue, url: ev.url, meta: formatWhen(ev.start) }} />
                        {ev.url && <LinkButton href={ev.url} variant="secondary" arrow>Open</LinkButton>}
                      </div>
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, STAGE_PER_PAGE - stageVisible.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="talks-stage__card-empty" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Fallback (mobile / narrow) ---- */}
      <div className="talks-fallback container">
        <PageHead
          eyebrow="Local Talks Checker"
          title="Talks near your bench"
          lead="Architecture events around Sydney."
        />

        <div className="cat-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`cat-btn${cat === c.key ? ' is-active' : ''}`}
              onClick={() => { setCat(c.key); setSelected(null) }}
            >
              {c.label}
              <span className="cat-btn__count">{countFor(c.key)}</span>
            </button>
          ))}
        </div>

        <div className="talks-layout">
          <div className="talks-map">
            <TalksMap events={filtered} selected={selected} onSelect={handleSelect} />
          </div>

          <aside className="talks-list">
            {filtered.length === 0 ? (
              <Note title="No events in this filter">Pick another category.</Note>
            ) : (
              filtered.map((ev) => (
                <div
                  key={ev.id}
                  className={`talk-row${selected?.id === ev.id ? ' is-selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                >
                  <div className="talk-row__top">
                    <div className="talk-row__name">
                      {ev.name}
                      {ev.badge && <span className="talk-row__badge">{ev.badge}</span>}
                    </div>
                    <span onClick={(e) => e.stopPropagation()}>
                      <PinButton item={{ id: ev.id, kind: 'talk', title: ev.name, subtitle: ev.venue, url: ev.url, meta: formatWhen(ev.start) }} />
                    </span>
                  </div>
                  <div className="talk-row__meta">{formatWhen(ev.start)} · {ev.venue}</div>
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
    </div>
  )
}
