import { IconPin, IconPinFilled } from '@tabler/icons-react'
import type { PinnedItem } from '../lib/storage'
import { togglePin, usePins } from '../lib/store'
import './components.css'

/** Pin/unpin any card to MY BENCH. Reactive across the app. */
export function PinButton({ item }: { item: PinnedItem }) {
  const pins = usePins()
  const active = pins.some((p) => p.kind === item.kind && p.id === item.id)
  return (
    <button
      type="button"
      className={`pin-btn${active ? ' is-pinned' : ''}`}
      onClick={() => togglePin(item)}
      aria-pressed={active}
      aria-label={active ? 'Unpin from MY BENCH' : 'Pin to MY BENCH'}
      title={active ? 'Pinned — click to remove' : 'Pin to MY BENCH'}
    >
      {active ? <IconPinFilled size={16} /> : <IconPin size={16} stroke={1.5} />}
    </button>
  )
}
