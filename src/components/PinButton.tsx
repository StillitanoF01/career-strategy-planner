import { IconPin, IconPinFilled } from '@tabler/icons-react'
import { useState } from 'react'
import type { PinnedItem } from '../lib/storage'
import { togglePin, usePins } from '../lib/store'
import './components.css'

/** Pin/unpin any card to MY BENCH. Reactive across the app. */
export function PinButton({ item }: { item: PinnedItem }) {
  const pins = usePins()
  const active = pins.some((p) => p.kind === item.kind && p.id === item.id)
  const [showToast, setShowToast] = useState(false)

  function handleClick() {
    const ok = togglePin(item)
    if (!ok) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className={`pin-btn${active ? ' is-pinned' : ''}`}
        onClick={handleClick}
        aria-pressed={active}
        aria-label={active ? 'Unpin from MY BENCH' : 'Pin to MY BENCH'}
        title={active ? 'Pinned — click to remove' : 'Pin to MY BENCH'}
      >
        {active ? <IconPinFilled size={16} /> : <IconPin size={16} stroke={1.5} />}
      </button>
      {showToast && (
        <span className="pin-max-toast">Max 6 pins reached</span>
      )}
    </span>
  )
}
