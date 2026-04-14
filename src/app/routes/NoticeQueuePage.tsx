import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { StatusPill } from '../../components/ui/StatusPill'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDateTime } from '../../lib/formatters'

export function NoticeQueuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => dataService.listNotices(),
  })

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          Outbound
        </div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">Notice print queue</h1>
        <p className="text-on-surface-variant">
          Notices generated from the system, waiting to be transmitted to the printing vendor.
        </p>
      </div>

      <Card tone="lowest" padding="none">
        <div className="p-6 pb-2">
          <SectionHeader eyebrow="Queue" title="All notices" />
        </div>
        {isLoading ? (
          <p className="p-8 text-on-surface-variant">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState icon="mail" title="No notices" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Type', 'Case', 'Generated', 'Sent', 'Method', 'Status'].map((h) => (
                  <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((n) => (
                <tr key={n.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3 font-semibold text-on-surface">{n.notice_type}</td>
                  <td className="px-5 py-3">
                    <Link to={`/cases/${n.case_id}`} className="text-primary hover:underline">
                      Open case →
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{formatDateTime(n.generated_at)}</td>
                  <td className="px-5 py-3 text-on-surface-variant">
                    {n.sent_at ? formatDateTime(n.sent_at) : '—'}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{n.delivery_method}</td>
                  <td className="px-5 py-3">
                    <StatusPill
                      tone={
                        n.status === 'Sent'
                          ? 'success'
                          : n.status === 'Queued'
                          ? 'primary'
                          : n.status === 'Failed'
                          ? 'error'
                          : 'neutral'
                      }
                    >
                      {n.status}
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
