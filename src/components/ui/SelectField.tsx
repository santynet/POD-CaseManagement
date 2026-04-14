import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, className, id, ...rest }, ref) => {
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
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 bg-surface-container-highest border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-lg text-sm text-on-surface outline-none appearance-none',
            error && 'border-error focus:border-error',
            className,
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  },
)
SelectField.displayName = 'SelectField'
