import type { Citation } from '../../domain/models'
import { AlertChip, type AlertKind } from '../ui/AlertChip'

export function AlertBar({ citation }: { citation: Citation }) {
  const alerts: AlertKind[] = []
  if (citation.is_in_collections) alerts.push('collections')
  if (citation.has_registration_hold) alerts.push('regHold')
  if (citation.has_tow_order) alerts.push('towOrder')
  if (citation.secondary_disposition === 'Awaiting Court') alerts.push('awaitingCourt')
  if (citation.secondary_disposition === 'Payment Plan') alerts.push('paymentPlan')
  if (alerts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map((k) => (
        <AlertChip key={k} kind={k} />
      ))}
    </div>
  )
}
