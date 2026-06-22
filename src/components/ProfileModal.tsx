import { useState } from 'react'
import { Button } from './Button'
import { COUNTRIES } from '../lib/countries'
import { setProfile } from '../lib/store'
import type { Profile } from '../lib/types'
import './components.css'
import './../pages/jobs.css' // .field / .input / .select

export function ProfileModal({
  initial,
  onClose,
}: {
  initial: Profile | null
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [country, setCountry] = useState(initial?.country ?? 'au')
  const [studyLevel, setStudyLevel] = useState(initial?.studyLevel ?? '')
  const [interests, setInterests] = useState((initial?.interests ?? []).join(', '))
  const units: Profile['units'] = initial?.units ?? 'metric'

  function save(e: React.FormEvent) {
    e.preventDefault()
    setProfile({
      name: name.trim() || undefined,
      city: city.trim() || 'Sydney',
      country,
      studyLevel: studyLevel.trim(),
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      units,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Set up your bench"
      >
        <div className="modal__head">
          <span className="modal__title">Set up your bench</span>
        </div>
        <p style={{ marginBottom: 'var(--space-4)' }}>
          A few details so the bench knows where you work and what you're after. Stored on this
          machine only — no account.
        </p>
        <form className="modal__form" onSubmit={save}>
          <label className="field">
            <span className="field__label">Name (optional)</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">City</span>
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Sydney"
            />
          </label>
          <label className="field">
            <span className="field__label">Country</span>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Study level</span>
            <input
              className="input"
              value={studyLevel}
              onChange={(e) => setStudyLevel(e.target.value)}
              placeholder="Master of Architecture, Year 1"
            />
          </label>
          <label className="field">
            <span className="field__label">Interests (comma-separated)</span>
            <input
              className="input"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="housing, adaptive reuse, timber"
            />
          </label>
<div className="modal__actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Skip
            </Button>
            <Button type="submit" arrow>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
