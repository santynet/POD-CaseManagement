import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  iconLeft?: string
  iconRight?: string
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-primary to-primary-dim text-on-primary shadow-sm shadow-primary/20 hover:opacity-95 active:opacity-85',
  secondary:
    'bg-surface-container-highest text-on-surface hover:bg-surface-container-high active:bg-surface-container',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
  danger:
    'bg-tertiary text-on-tertiary hover:bg-tertiary-dim active:opacity-90',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-sm rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', iconLeft, iconRight, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {iconLeft && <span className="material-symbols-outlined text-base">{iconLeft}</span>}
      {children}
      {iconRight && <span className="material-symbols-outlined text-base">{iconRight}</span>}
    </button>
  ),
)
Button.displayName = 'Button'
