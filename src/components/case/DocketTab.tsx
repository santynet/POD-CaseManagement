import type { CaseDetail } from '../../domain/models'
import { Card, SectionHeader } from '../ui/Card'
import { Timeline, type TimelineItem } from '../ui/Timeline'
import { formatDateTime } from '../../lib/formatters'

export function DocketTab({ data }: { data: CaseDetail }) {
  const items: TimelineItem[] = data.docket.map((d) => ({
    id: d.id,
    icon: iconFor(d.event_type),
    title: d.description,
    subtitle: d.event_type.replace(/([A-Z])/g, ' $1').trim(),
    timestamp: formatDateTime(d.event_at),
    tone: toneFor(d.event_type),
  }))
  return (
    <Card tone="lowest">
      <SectionHeader eyebrow="Case history" title="Docket" />
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No docket entries yet.</p>
      ) : (
        <Timeline items={items} />
      )}
    </Card>
  )
}

function iconFor(t: string): string {
  const map: Record<string, string> = {
    CitationIssued: 'assignment',
    CitationEntered: 'input',
    PartyMatched: 'person_check',
    LiabilityTransferred: 'swap_horiz',
    HearingRequested: 'gavel',
    HearingDecisionEntered: 'gavel',
    MotionRequested: 'description',
    PaymentAccepted: 'payments',
    DocumentUploaded: 'upload_file',
    NoticeSent: 'mail',
    AddedToCollections: 'currency_exchange',
    RemovedFromCollections: 'task_alt',
    CollectionAgencyAssigned: 'apartment',
    RegistrationHoldAdded: 'lock',
    RegistrationHoldRemoved: 'lock_open',
    TowOrderAdded: 'local_shipping',
    TowOrderRemoved: 'task_alt',
  }
  return map[t] ?? 'circle'
}

function toneFor(t: string): 'primary' | 'tertiary' | 'neutral' | 'success' {
  if (t.startsWith('Payment')) return 'success'
  if (t.includes('Collection') || t.includes('Hold') || t.includes('Tow')) return 'tertiary'
  if (t === 'CitationIssued' || t === 'PartyMatched' || t === 'LiabilityTransferred') return 'primary'
  return 'neutral'
}
