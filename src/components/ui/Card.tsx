import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'lowest' | 'low' | 'base' | 'high' | 'highest'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const toneClasses: Record<Tone, string> = {
  lowest: 'bg-surface-container-lowest',
  low: 'bg-surface-container-low',
  base: 'bg-surface-container',
  high: 'bg-surface-container-high',
  highest: 'bg-surface-container-highest',
}

const padClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ tone = 'lowest', padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-xl ring-1 ring-outline-variant/15 shadow-sm', toneClasses[tone], padClasses[padding], className)}
      {...rest}
    >
      {children}
    </div>
  )
}

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ eyebrow, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between mb-4', className)}>
      <div>
        {eyebrow && (
          <div className="text-label-sm uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-title-lg font-bold text-on-surface">{title}</h2>
      </div>
      {action}
    </div>
  )
}
