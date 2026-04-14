import { cn } from '../../lib/cn'

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-4">
      {steps.map((s, i) => {
        const active = i === current
        const done = i < current
        return (
          <li key={s.label} className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                  done && 'bg-primary text-on-primary',
                  active && 'bg-gradient-to-br from-primary to-primary-dim text-on-primary ring-4 ring-primary/15',
                  !active && !done && 'bg-surface-container-highest text-on-surface-variant',
                )}
              >
                {done ? <span className="material-symbols-outlined text-lg">check</span> : i + 1}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-label-sm uppercase tracking-wider font-semibold',
                    active ? 'text-primary' : 'text-on-surface-variant',
                  )}
                >
                  Step {i + 1}
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold truncate',
                    active || done ? 'text-on-surface' : 'text-on-surface-variant',
                  )}
                >
                  {s.label}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <span className={cn('flex-1 h-px', i < current ? 'bg-primary/40' : 'bg-outline-variant/30')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
