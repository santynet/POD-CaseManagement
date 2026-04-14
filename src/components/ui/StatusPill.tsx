import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'tertiary'

interface StatusPillProps {
  tone?: Tone
  icon?: string
  children: ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-error-container/40 text-error-dim',
  tertiary: 'bg-tertiary/10 text-tertiary',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
}

export function StatusPill({ tone = 'neutral', icon, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {children}
    </span>
  )
}

export function dispositionTone(disp?: string | null): Tone {
  switch (disp) {
    case 'Paid':
      return 'success'
    case 'In Collections':
      return 'tertiary'
    case 'Registration Hold':
    case 'Tow Order':
      return 'error'
    case 'Awaiting Court':
    case 'Hearing Requested':
    case 'Motion Requested':
    case 'Payment Plan':
      return 'primary'
    case 'Liability Transferred':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function statusTone(status?: string | null): Tone {
  switch (status) {
    case 'Open':
      return 'primary'
    case 'Closed':
      return 'neutral'
    case 'Dismissed':
      return 'success'
    default:
      return 'neutral'
  }
}
