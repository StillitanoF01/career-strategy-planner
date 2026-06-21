import type { ReactNode } from 'react'
import './components.css'

/** Solid ink label, stamped onto material. */
export function EyebrowTag({ children }: { children: ReactNode }) {
  return <span className="eyebrow-tag">{children}</span>
}
