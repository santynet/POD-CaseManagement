import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export const formatDate = (value: string | Date | null | undefined, pattern = 'MMM d, yyyy') => {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  return format(d, pattern)
}

export const formatDateTime = (value: string | Date | null | undefined) =>
  formatDate(value, "MMM d, yyyy 'at' h:mm a")

export const formatRelative = (value: string | Date | null | undefined) => {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  return formatDistanceToNow(d, { addSuffix: true })
}

export const formatPlate = (plate: string, state: string) => `${plate} · ${state}`

export const formatPartyName = (p: {
  party_type: 'Person' | 'Company'
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
}) => {
  if (p.party_type === 'Company') return p.company_name ?? '—'
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || '—'
}
