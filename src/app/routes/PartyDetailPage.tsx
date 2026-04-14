import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { StatusPill, statusTone, dispositionTone } from '../../components/ui/StatusPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatCurrency, formatDate, formatPartyName } from '../../lib/formatters'

export function PartyDetailPage() {
  const { partyId } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['party', partyId],
    queryFn: () => dataService.getPartyDetail(partyId!),
    enabled: !!partyId,
  })

  if (isLoading) return <p className="text-on-surface-variant">Loading party…</p>
  if (!data) return <EmptyState icon="person_off" title="Party not found" />

  const { party, addresses, plateHistory, relatedCases } = data
  const currentAddress = addresses.find((a) => a.is_current)

  const totalOutstanding = relatedCases.reduce((sum, c) => sum + Number(c.balance), 0)
  const totalFines = relatedCases.reduce((sum, c) => sum + Number(c.fine_amount), 0)

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          <Link to="/search" className="hover:text-primary">Search</Link> › Party
        </div>
        <div className="flex items-center gap-4 mt-1">
          <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">
            {formatPartyName(party)}
          </h1>
          <StatusPill tone="primary" icon="verified">Active</StatusPill>
        </div>
        <p className="text-on-surface-variant">
          {party.party_type} · {party.dl_number ? `DL ${party.dl_number} (${party.dl_state})` : 'No DL on file'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Total cases" value={String(relatedCases.length)} />
        <Metric label="Total fines" value={formatCurrency(totalFines)} />
        <Metric label="Outstanding" value={formatCurrency(totalOutstanding)} emphasis={totalOutstanding > 0 ? 'error' : 'success'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card tone="lowest">
            <SectionHeader eyebrow="Contact" title="Personal details" />
            <dl className="space-y-3 text-sm">
              <Info label="Date of birth" value={formatDate(party.dob)} />
              <Info label="Email" value={party.email ?? '—'} />
              <Info label="Phone" value={party.phone ?? '—'} />
              <Info
                label="Current address"
                value={
                  currentAddress
                    ? `${currentAddress.line1}, ${currentAddress.city} ${currentAddress.state} ${currentAddress.postal_code}`
                    : '—'
                }
              />
            </dl>
          </Card>

          <Card tone="lowest">
            <SectionHeader eyebrow="Vehicles" title="Plate history" />
            <ul className="space-y-3">
              {plateHistory.length === 0 && <p className="text-sm text-on-surface-variant">No plates on file.</p>}
              {plateHistory.map((pp) => (
                <li key={pp.id}>
                  <Link
                    to={`/plates/${pp.plate_id}`}
                    className="block p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">
                        {pp.plate?.plate_number} · {pp.plate?.state}
                      </span>
                      <StatusPill tone={pp.is_current ? 'primary' : 'neutral'}>
                        {pp.is_current ? 'Current' : 'Historical'}
                      </StatusPill>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      {pp.vehicle ? `${pp.vehicle.year ?? ''} ${pp.vehicle.make ?? ''} ${pp.vehicle.model ?? ''}` : '—'}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {formatDate(pp.effective_start)}
                      {pp.effective_end ? ` – ${formatDate(pp.effective_end)}` : ' – Present'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card tone="lowest" padding="none">
            <div className="p-6 pb-2">
              <SectionHeader eyebrow="History" title="Related cases" />
            </div>
            {relatedCases.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">No cases linked to this party.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Citation #', 'Violation', 'Issue date', 'Status', 'Disposition', 'Balance'].map((h) => (
                      <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatedCases.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/cases/${c.id}`} className="font-bold text-primary hover:underline">
                          #{c.citation_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-on-surface">{c.violation_description}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{formatDate(c.incident_date)}</td>
                      <td className="px-5 py-3"><StatusPill tone={statusTone(c.primary_status)}>{c.primary_status}</StatusPill></td>
                      <td className="px-5 py-3">
                        {c.secondary_disposition !== 'None' && (
                          <StatusPill tone={dispositionTone(c.secondary_disposition)}>{c.secondary_disposition}</StatusPill>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold">{formatCurrency(Number(c.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
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

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: 'error' | 'success' }) {
  return (
    <Card tone="lowest">
      <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{label}</div>
      <div
        className={`text-3xl font-extrabold mt-1 ${
          emphasis === 'error' ? 'text-error' : emphasis === 'success' ? 'text-emerald-700' : 'text-on-surface'
        }`}
      >
        {value}
      </div>
    </Card>
  )
}
