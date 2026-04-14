import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { StatusPill } from '../../components/ui/StatusPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/formatters'

type Queue = 'FL' | 'OOS'

export function RegistrationQueuePage() {
  const [queue, setQueue] = useState<Queue>('FL')
  const { data, isLoading } = useQuery({
    queryKey: ['queue', queue],
    queryFn: () => dataService.listQueue(queue),
  })

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          Operations
        </div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">Registration lookup queue</h1>
        <p className="text-on-surface-variant">
          Plates awaiting FTP-driven lookup for Florida and Out-of-State registrations.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['FL', 'OOS'] as Queue[]).map((q) => (
          <button
            key={q}
            onClick={() => setQueue(q)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              queue === q
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {q === 'FL' ? 'Florida' : 'Out of State'}
          </button>
        ))}
      </div>

      <Card tone="lowest" padding="none">
        <div className="p-6 pb-2">
          <SectionHeader eyebrow="Queue" title={queue === 'FL' ? 'Florida lookup queue' : 'Out-of-State lookup queue'} />
        </div>
        {isLoading ? (
          <p className="p-8 text-on-surface-variant">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState icon="inbox" title="Queue is empty" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Plate', 'State', 'Citation', 'Submitted', 'Status'].map((h) => (
                  <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/plates/${r.plate_id}`} className="font-bold text-primary hover:underline">
                      {r.plate?.plate_number ?? '—'}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{r.plate?.state ?? '—'}</td>
                  <td className="px-5 py-3">
                    {r.citation_id && (
                      <Link to={`/cases/${r.citation_id}`} className="text-primary hover:underline">
                        Open case →
                      </Link>
                    )}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{formatDateTime(r.submitted_at)}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={r.result_status === 'Returned' ? 'success' : r.result_status === 'Failed' ? 'error' : 'primary'}>
                      {r.result_status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
