import { Link } from 'react-router-dom'
import type { CaseDetail } from '../../domain/models'
import { StatusPill, statusTone, dispositionTone } from '../ui/StatusPill'
import { Button } from '../ui/Button'
import { AlertBar } from './AlertBar'
import { formatCurrency, formatDate, formatPartyName } from '../../lib/formatters'

interface CaseHeaderProps {
  data: CaseDetail
  onAcceptPayment: () => void
  onRequestHearing: () => void
  onRequestMotion: () => void
}

export function CaseHeader({ data, onAcceptPayment, onRequestHearing, onRequestMotion }: CaseHeaderProps) {
  const c = data.citation
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
            <Link to="/search" className="hover:text-primary">Search</Link>
            <span>›</span>
            <span>Case</span>
          </div>
          <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">
            #{c.citation_number}
          </h1>
          <p className="text-on-surface-variant mt-1">{c.violation_description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StatusPill tone={statusTone(c.primary_status)} icon="flag">
              {c.primary_status}
            </StatusPill>
            {c.secondary_disposition !== 'None' && (
              <StatusPill tone={dispositionTone(c.secondary_disposition)}>
                {c.secondary_disposition}
              </StatusPill>
            )}
          </div>

          <div className="mt-3">
            <AlertBar citation={c} />
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
            Outstanding balance
          </div>
          <div className={`text-4xl font-extrabold tracking-tight ${Number(c.balance) > 0 ? 'text-error' : 'text-emerald-600'}`}>
            {formatCurrency(Number(c.balance))}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">
            Due {formatDate(c.due_date)} · Fine {formatCurrency(Number(c.fine_amount))}
          </div>

          <div className="flex justify-end gap-2 mt-4 flex-wrap">
            <Button variant="primary" size="md" iconLeft="payments" onClick={onAcceptPayment}>
              Accept Payment
            </Button>
            <Link to={`/cases/${c.id}/transfer`}>
              <Button variant="secondary" size="md" iconLeft="swap_horiz">
                Transfer Liability
              </Button>
            </Link>
            <Button variant="secondary" size="md" iconLeft="gavel" onClick={onRequestHearing}>
              Request Hearing
            </Button>
            <Button variant="ghost" size="md" iconLeft="description" onClick={onRequestMotion}>
              Motion
            </Button>
          </div>
        </div>
      </div>

      {data.liableParty && (
        <div className="mt-6 p-4 rounded-xl bg-surface-container-low flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary font-bold flex items-center justify-center">
            {formatPartyName(data.liableParty)[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
              Current liable party
            </div>
            <Link to={`/parties/${data.liableParty.id}`} className="font-bold text-on-surface hover:text-primary">
              {formatPartyName(data.liableParty)}
            </Link>
            {data.liableParty.dl_number && (
              <span className="ml-3 text-xs text-on-surface-variant">DL {data.liableParty.dl_number}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
