import { Link } from 'react-router-dom'
import type { CaseDetail } from '../../domain/models'
import { Card, SectionHeader } from '../ui/Card'
import { StatusPill } from '../ui/StatusPill'
import { formatDate, formatDateTime } from '../../lib/formatters'
import { EmptyState } from '../ui/EmptyState'

export function PlateTab({ data }: { data: CaseDetail }) {
  if (!data.plate) return <EmptyState icon="directions_car" title="No plate on this case" />
  return (
    <Card tone="lowest">
      <SectionHeader
        eyebrow="Plate"
        title={`${data.plate.plate_number} · ${data.plate.state}`}
        action={
          <Link to={`/plates/${data.plate.id}`} className="text-xs font-semibold text-primary hover:underline">
            View full history →
          </Link>
        }
      />
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <Info label="Plate type" value={data.plate.plate_type ?? '—'} />
        <Info label="Lookup status" value={data.plate.lookup_status} />
        {data.vehicle && (
          <>
            <Info label="Make / model" value={`${data.vehicle.make ?? ''} ${data.vehicle.model ?? ''}`} />
            <Info label="Year / color" value={`${data.vehicle.year ?? ''} ${data.vehicle.color ?? ''}`} />
            <Info label="VIN" value={data.vehicle.vin ?? '—'} />
            <Info label="Body style" value={data.vehicle.body_style ?? '—'} />
          </>
        )}
      </dl>
    </Card>
  )
}

export function HearingsTab({ data }: { data: CaseDetail }) {
  return (
    <div className="space-y-6">
      <Card tone="lowest">
        <SectionHeader eyebrow="Court" title="Hearings" />
        {data.hearings.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No hearings requested.</p>
        ) : (
          <ul className="space-y-3">
            {data.hearings.map((h) => (
              <li key={h.id} className="p-4 rounded-xl bg-surface-container-low">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-on-surface">
                      {h.scheduled_at ? `Scheduled ${formatDateTime(h.scheduled_at)}` : 'Hearing requested'}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      Requested {formatDateTime(h.requested_at)}
                    </div>
                  </div>
                  <StatusPill tone={h.status === 'Scheduled' ? 'primary' : 'neutral'}>{h.status}</StatusPill>
                </div>
                {h.decision && <div className="mt-2 text-sm text-on-surface-variant">Decision: {h.decision}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card tone="lowest">
        <SectionHeader eyebrow="Filings" title="Motions" />
        {data.motions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No motions filed.</p>
        ) : (
          <ul className="space-y-3">
            {data.motions.map((m) => (
              <li key={m.id} className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">{m.motion_type}</div>
                  <div className="text-xs text-on-surface-variant">{formatDateTime(m.requested_at)}</div>
                </div>
                <StatusPill tone={m.status === 'Granted' ? 'success' : m.status === 'Denied' ? 'error' : 'neutral'}>
                  {m.status}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function DocumentsTab({ data }: { data: CaseDetail }) {
  const groups = data.documents.reduce<Record<string, typeof data.documents>>((acc, d) => {
    ;(acc[d.category] ??= []).push(d)
    return acc
  }, {})

  if (data.documents.length === 0)
    return <EmptyState icon="folder" title="No documents" description="Upload evidence, notices, or decisions." />

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([category, docs]) => (
        <Card key={category} tone="lowest">
          <SectionHeader eyebrow="Category" title={category} />
          <ul className="divide-y divide-outline-variant/15">
            {docs.map((d) => (
              <li key={d.id} className="py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">description</span>
                <div className="flex-1">
                  <div className="font-semibold text-on-surface">{d.filename}</div>
                  <div className="text-xs text-on-surface-variant">
                    {formatDateTime(d.uploaded_at)} · {d.mime_type ?? 'file'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

export function CollectionsTab({ data }: { data: CaseDetail }) {
  return (
    <div className="space-y-6">
      <Card tone="lowest">
        <SectionHeader eyebrow="Collections" title="Agency assignments" />
        {data.collections.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Not assigned to a collection agency.</p>
        ) : (
          <ul className="space-y-3">
            {data.collections.map((c) => (
              <li key={c.id} className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">{c.agency_name}</div>
                  <div className="text-xs text-on-surface-variant">
                    Assigned {formatDate(c.assigned_at)}
                    {c.removed_at && ` · Removed ${formatDate(c.removed_at)}`}
                  </div>
                </div>
                <StatusPill tone={c.is_active ? 'tertiary' : 'neutral'}>
                  {c.is_active ? 'Active' : 'Closed'}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card tone="lowest">
        <SectionHeader eyebrow="Holds" title="Registration holds & tow orders" />
        {data.holds.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No active holds.</p>
        ) : (
          <ul className="space-y-3">
            {data.holds.map((h) => (
              <li key={h.id} className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">{h.hold_type}</div>
                  <div className="text-xs text-on-surface-variant">
                    Placed {formatDate(h.placed_at)}
                    {h.released_at && ` · Released ${formatDate(h.released_at)}`}
                    {h.reason && ` · ${h.reason}`}
                  </div>
                </div>
                <StatusPill tone={h.is_active ? 'error' : 'neutral'}>
                  {h.is_active ? 'Active' : 'Released'}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
