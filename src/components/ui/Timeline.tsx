import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TimelineItem {
  id: string
  icon?: string
  title: ReactNode
  subtitle?: ReactNode
  timestamp?: string
  tone?: 'primary' | 'tertiary' | 'neutral' | 'success'
  body?: ReactNode
}

const dotTone = {
  primary: 'bg-primary text-on-primary',
  tertiary: 'bg-tertiary text-on-tertiary',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
  success: 'bg-emerald-500 text-white',
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-outline-variant/40" aria-hidden />
      {items.map((it) => (
        <li key={it.id} className="relative pl-12 pb-6 last:pb-0">
          <span
            className={cn(
              'absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-background',
              dotTone[it.tone ?? 'neutral'],
            )}
          >
            {it.icon && <span className="material-symbols-outlined text-base">{it.icon}</span>}
          </span>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold text-on-surface text-sm">{it.title}</div>
              {it.subtitle && <div className="text-xs text-on-surface-variant mt-0.5">{it.subtitle}</div>}
            </div>
            {it.timestamp && (
              <div className="text-label-sm uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                {it.timestamp}
              </div>
            )}
          </div>
          {it.body && <div className="mt-2 text-sm text-on-surface-variant">{it.body}</div>}
        </li>
      ))}
    </ol>
  )
}
