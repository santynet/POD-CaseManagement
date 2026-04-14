import { cn } from '../../lib/cn'

export type CaseTab =
  | 'overview'
  | 'parties'
  | 'plate'
  | 'financials'
  | 'hearings'
  | 'documents'
  | 'docket'
  | 'collections'

const tabs: { id: CaseTab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',       icon: 'info' },
  { id: 'parties',    label: 'Parties',        icon: 'group' },
  { id: 'plate',      label: 'Plate & Vehicle',icon: 'directions_car' },
  { id: 'financials', label: 'Financials',     icon: 'payments' },
  { id: 'hearings',   label: 'Hearings',       icon: 'gavel' },
  { id: 'documents',  label: 'Documents',      icon: 'folder' },
  { id: 'docket',     label: 'Docket',         icon: 'history' },
  { id: 'collections',label: 'Collections',    icon: 'currency_exchange' },
]

interface CaseTabsProps {
  value: CaseTab
  onChange: (tab: CaseTab) => void
}

export function CaseTabs({ value, onChange }: CaseTabsProps) {
  return (
    <div className="border-b border-outline-variant/20 mb-6">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {tabs.map((t) => {
          const active = value === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
