import { cn } from '../../lib/cn'

type AlertKind = 'collections' | 'regHold' | 'towOrder' | 'awaitingCourt' | 'paymentPlan'

const config: Record<AlertKind, { label: string; icon: string; classes: string }> = {
  collections: {
    label: 'In Collections',
    icon: 'gavel',
    classes: 'bg-tertiary/10 text-tertiary ring-tertiary/20',
  },
  regHold: {
    label: 'Registration Hold',
    icon: 'lock',
    classes: 'bg-error-container/30 text-error-dim ring-error/20',
  },
  towOrder: {
    label: 'Tow Order',
    icon: 'local_shipping',
    classes: 'bg-error-container/30 text-error-dim ring-error/20',
  },
  awaitingCourt: {
    label: 'Awaiting Court',
    icon: 'schedule',
    classes: 'bg-primary/10 text-primary ring-primary/20',
  },
  paymentPlan: {
    label: 'Payment Plan',
    icon: 'payments',
    classes: 'bg-secondary-container text-on-secondary-container ring-secondary/20',
  },
}

interface AlertChipProps {
  kind: AlertKind
  className?: string
}

export function AlertChip({ kind, className }: AlertChipProps) {
  const c = config[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1',
        c.classes,
        className,
      )}
    >
      <span className="material-symbols-outlined text-sm">{c.icon}</span>
      {c.label}
    </span>
  )
}

export type { AlertKind }
