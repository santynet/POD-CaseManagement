import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { Timeline, type TimelineItem } from '../../components/ui/Timeline'
import { StatusPill, dispositionTone, statusTone } from '../../components/ui/StatusPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatCurrency, formatDate, formatPartyName } from '../../lib/formatters'

export function PlateHistoryPage() {
  const { plateId } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['plate', plateId],
    queryFn: () => dataService.getPlateDetail(plateId!),
    enabled: !!plateId,
  })

  if (isLoading) return <p className="text-on-surface-variant">Loading plate…</p>
  if (!data) return <EmptyState icon="directions_car" title="Plate not found" />

  const items: TimelineItem[] = data.history.map((h) => ({
    id: h.id,
    icon: h.is_current ? 'location_on' : 'history',
    title: h.party ? (
      <Link to={`/parties/${h.party.id}`} className="hover:text-primary">
        {formatPartyName(h.party)}
      </Link>
    ) : (
      <span className="text-on-surface-variant">No registered owner</span>
    ),
    subtitle: h.vehicle
      ? `${h.vehicle.year ?? ''} ${h.vehicle.make ?? ''} ${h.vehicle.model ?? ''} · ${h.vehicle.color ?? ''}`
      : undefined,
    timestamp: `${formatDate(h.effective_start)} – ${h.effective_end ? formatDate(h.effective_end) : 'Present'}`,
    tone: h.is_current ? 'primary' : 'neutral',
  }))

  return (
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
            <Link to="/search" className="hover:text-primary">Search</Link> › Plate
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">
              {data.plate.plate_number}
            </h1>
            <StatusPill tone="primary">{data.plate.state}</StatusPill>
            <StatusPill tone={data.plate.lookup_status === 'Found' ? 'success' : 'warning'}>
              {data.plate.lookup_status}
            </StatusPill>
          </div>
        </div>

        <Card tone="lowest">
          <SectionHeader eyebrow="Timeline" title="Plate ↔ Party associations" />
          {items.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No history on file.</p>
          ) : (
            <Timeline items={items} />
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card tone="lowest">
          <SectionHeader eyebrow="Cases" title="Cases on this plate" />
          {data.relatedCases.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No cases on this plate.</p>
          ) : (
            <ul className="space-y-2">
              {data.relatedCases.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/cases/${c.id}`}
                    className="block p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">#{c.citation_number}</span>
                      <span className="text-xs font-semibold">{formatCurrency(Number(c.balance))}</span>
                    </div>
                    <div className="text-xs text-on-surface-variant truncate">{c.violation_description}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <StatusPill tone={statusTone(c.primary_status)}>{c.primary_status}</StatusPill>
                      {c.secondary_disposition !== 'None' && (
                        <StatusPill tone={dispositionTone(c.secondary_disposition)}>
                          {c.secondary_disposition}
                        </StatusPill>
                      )}
                    </div>
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
