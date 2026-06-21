import type { ReactNode } from 'react'
import '../pages/page.css'

/** Foreman's note — empty / loading / error states. State what's missing + what to do. */
export function Note({
  title,
  children,
  variant,
}: {
  title: string
  children?: ReactNode
  variant?: 'error'
}) {
  return (
    <div className={`note${variant === 'error' ? ' note--error' : ''}`} role={variant === 'error' ? 'alert' : undefined}>
      <div className="note__title">{title}</div>
      {children && <div className="note__body">{children}</div>}
    </div>
  )
}
