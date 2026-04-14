import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { formatCurrency } from '../../lib/formatters'
import { useSessionStore } from '../../store/sessionStore'

export function DashboardPage() {
  const user = useSessionStore((s) => s.user)
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => dataService.dashboardStats() })

  const stats = [
    { label: 'Open Cases', value: data?.openCases ?? '—', icon: 'folder_open', tone: 'primary' },
    { label: 'Total Outstanding', value: data ? formatCurrency(data.totalOutstanding) : '—', icon: 'payments', tone: 'tertiary' },
    { label: 'In Collections', value: data?.inCollections ?? '—', icon: 'gavel', tone: 'error' },
    { label: 'Pending Lookups', value: data?.pendingLookups ?? '—', icon: 'plagiarism', tone: 'secondary' },
    { label: 'Queued Notices', value: data?.queuedNotices ?? '—', icon: 'mail', tone: 'primary' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          Welcome back, {user?.displayName}
        </div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">
          Parking Operations Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {stats.map((s) => (
          <Card key={s.label} tone="lowest">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  {s.label}
                </div>
                <div className="text-2xl font-extrabold text-on-surface truncate">{s.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card tone="lowest">
          <SectionHeader eyebrow="Shortcuts" title="Jump back in" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/search?q=08662452" className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Hero Case</div>
              <div className="font-bold text-on-surface">#08662452 — Kurt Eyre</div>
            </Link>
            <Link to="/search?q=RITP63" className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Plate</div>
              <div className="font-bold text-on-surface">RITP63 · FL</div>
            </Link>
            <Link to="/lookups" className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Queue</div>
              <div className="font-bold text-on-surface">Registration Lookups</div>
            </Link>
            <Link to="/notices" className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Outbound</div>
              <div className="font-bold text-on-surface">Notice Queue</div>
            </Link>
          </div>
        </Card>

        <Card tone="lowest">
          <SectionHeader eyebrow="System" title="Integration status" />
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-on-surface-variant">Real-time registration lookup</span>
              <span className="text-xs font-semibold text-emerald-600">Mocked · 70% hit</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-on-surface-variant">FL lookup queue (FTP)</span>
              <span className="text-xs font-semibold text-amber-600">Stubbed</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-on-surface-variant">OOS lookup queue (FTP)</span>
              <span className="text-xs font-semibold text-amber-600">Stubbed</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-on-surface-variant">Outbound notice printing</span>
              <span className="text-xs font-semibold text-amber-600">Stubbed</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
