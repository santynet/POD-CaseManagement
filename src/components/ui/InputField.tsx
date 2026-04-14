import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  iconLeft?: string
  trailing?: ReactNode
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, iconLeft, trailing, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name ?? label?.replace(/\s+/g, '-').toLowerCase()
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label-sm uppercase tracking-wider font-semibold text-on-surface-variant block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="material-symbols-outlined text-outline text-lg absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full py-3 bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg transition-all placeholder:text-outline text-on-surface text-sm outline-none',
              iconLeft ? 'pl-11' : 'pl-4',
              trailing ? 'pr-11' : 'pr-4',
              error && 'border-error focus:border-error',
              className,
            )}
            {...rest}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{trailing}</div>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  },
)
InputField.displayName = 'InputField'
