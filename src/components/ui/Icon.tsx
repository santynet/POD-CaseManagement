import { cn } from '../../lib/cn'

interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className, filled }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  )
}
