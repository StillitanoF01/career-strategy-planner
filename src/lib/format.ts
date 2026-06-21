// Small deterministic formatting helpers. No external calls.

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  au: 'AUD', us: 'USD', gb: 'GBP', ca: 'CAD', nz: 'NZD', sg: 'SGD',
  za: 'ZAR', in: 'INR', de: 'EUR', es: 'EUR', fr: 'EUR', it: 'EUR',
  nl: 'EUR', at: 'EUR', pl: 'PLN', br: 'BRL', mx: 'MXN',
}

export function formatSalaryRange(min?: number, max?: number, country = 'au'): string | null {
  if (min == null && max == null) return null
  const currency = CURRENCY_BY_COUNTRY[country] ?? 'USD'
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: n >= 10000 ? 'compact' : 'standard',
    }).format(n)
  if (min != null && max != null && min !== max) return `${fmt(min)}–${fmt(max)}`
  return fmt((min ?? max) as number)
}

export function timeAgo(iso: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.round((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 31) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

/** Days until an ISO date (negative if past). null if unparseable. */
export function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}
