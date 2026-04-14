import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { CaseDetail } from '../../domain/models'
import { Card, SectionHeader } from '../ui/Card'
import { Timeline, type TimelineItem } from '../ui/Timeline'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters'
import { dataService } from '../../services/dataService'

interface OverviewTabProps {
  data: CaseDetail
}

export function OverviewTab({ data }: OverviewTabProps) {
  const c = data.citation

  const relatedQ = useQuery({
    queryKey: ['related', c.id, data.liableParty?.id, c.plate_id],
    queryFn: async () => {
      if (data.liableParty) {
        return { kind: 'party' as const, cases: await dataService.relatedCasesByParty(data.liableParty.id, c.id) }
      }
      if (c.plate_id) {
        return { kind: 'plate' as const, cases: await dataService.relatedCasesByPlate(c.plate_id, c.id) }
      }
      return { kind: 'none' as const, cases: [] }
    },
  })

  const timelineItems: TimelineItem[] = data.docket.slice(0, 6).map((d) => ({
    id: d.id,
    icon: iconFor(d.event_type),
    title: d.description,
    timestamp: formatDateTime(d.event_at),
    tone: toneFor(d.event_type),
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card tone="lowest">
          <SectionHeader eyebrow="Violation" title="Incident details" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Info label="Charge code" value={c.violation_code} />
            <Info label="Description" value={c.violation_description} />
            <Info label="Location" value={c.location ?? '—'} />
            <Info label="Incident date" value={formatDateTime(c.incident_date)} />
            <Info label="Issuing officer" value={c.issuing_officer ?? '—'} />
            <Info label="Agency" value={c.agency ?? '—'} />
            <Info label="Entered" value={formatDate(c.entered_date)} />
            <Info label="Due date" value={formatDate(c.due_date)} />
            <Info label="Fine" value={formatCurrency(Number(c.fine_amount))} />
            <Info label="Balance" value={formatCurrency(Number(c.balance))} />
          </dl>
        </Card>

        {data.plate && (
          <Card tone="lowest">
            <SectionHeader
              eyebrow="Vehicle"
              title="Plate & vehicle"
              action={
                <Link to={`/plates/${data.plate.id}`} className="text-xs font-semibold text-primary hover:underline">
                  View plate history →
                </Link>
              }
            />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Info label="Plate" value={`${data.plate.plate_number} · ${data.plate.state}`} />
              <Info label="Lookup status" value={data.plate.lookup_status} />
              {data.vehicle && (
                <>
                  <Info label="Make / model" value={`${data.vehicle.make ?? '—'} ${data.vehicle.model ?? ''}`} />
                  <Info label="Year / color" value={`${data.vehicle.year ?? '—'} ${data.vehicle.color ?? ''}`} />
                  <Info label="VIN" value={data.vehicle.vin ?? '—'} />
                  <Info label="Body style" value={data.vehicle.body_style ?? '—'} />
                </>
              )}
            </dl>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card tone="lowest">
          <SectionHeader eyebrow="Lifecycle" title="Recent activity" />
          {timelineItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No docket entries yet.</p>
          ) : (
            <Timeline items={timelineItems} />
          )}
        </Card>

        <Card tone="lowest">
          <SectionHeader
            eyebrow={relatedQ.data?.kind === 'plate' ? 'By tag (no party matched)' : 'By party'}
            title="Related cases"
          />
          {(relatedQ.data?.cases.length ?? 0) === 0 ? (
            <p className="text-sm text-on-surface-variant">No related cases.</p>
          ) : (
            <ul className="space-y-2">
              {relatedQ.data!.cases.slice(0, 6).map((rc) => (
                <li key={rc.id}>
                  <Link
                    to={`/cases/${rc.id}`}
                    className="block p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary">#{rc.citation_number}</span>
                      <span className="text-xs text-on-surface-variant">
                        {formatCurrency(Number(rc.balance))}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant truncate">{rc.violation_description}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{label}</dt>
      <dd className="text-on-surface font-medium mt-0.5">{value}</dd>
    </div>
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
