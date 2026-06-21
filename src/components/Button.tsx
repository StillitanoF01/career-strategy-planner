import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './components.css'

type Variant = 'primary' | 'secondary'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  arrow?: boolean
  children: ReactNode
}

/** Plain action button. */
export function Button({ variant = 'primary', arrow, children, className = '', ...rest }: ButtonProps) {
  return (
    <button className={`btn btn--${variant} ${className}`.trim()} {...rest}>
      {children}
      {arrow && <span className="btn__arrow" aria-hidden="true">→</span>}
    </button>
  )
}

type LinkButtonProps = {
  variant?: Variant
  arrow?: boolean
  children: ReactNode
  className?: string
  /** Internal route (react-router). */
  to?: string
  /** External URL (opens in new tab). */
  href?: string
}

/** Button-styled link — internal (`to`) or external (`href`). */
export function LinkButton({ variant = 'primary', arrow, children, className = '', to, href }: LinkButtonProps) {
  const cls = `btn btn--${variant} ${className}`.trim()
  const inner = (
    <>
      {children}
      {arrow && <span className="btn__arrow" aria-hidden="true">→</span>}
    </>
  )
  if (to) {
    return (
      <Link className={cls} to={to}>
        {inner}
      </Link>
    )
  }
  return (
    <a className={cls} href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  )
}
