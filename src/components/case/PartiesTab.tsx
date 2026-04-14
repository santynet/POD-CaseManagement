import { Link } from 'react-router-dom'
import type { CaseDetail } from '../../domain/models'
import { Card, SectionHeader } from '../ui/Card'
import { StatusPill } from '../ui/StatusPill'
import { formatDate, formatPartyName } from '../../lib/formatters'

export function PartiesTab({ data }: { data: CaseDetail }) {
  return (
    <Card tone="lowest">
      <SectionHeader eyebrow="Case parties" title="All parties (current & historical)" />
      <ul className="divide-y divide-outline-variant/15">
        {data.parties.map((p) => (
          <li key={p.id} className="py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary flex items-center justify-center font-bold">
              {p.party ? formatPartyName(p.party)[0] : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {p.party && (
                  <Link to={`/parties/${p.party.id}`} className="font-bold text-on-surface hover:text-primary">
                    {formatPartyName(p.party)}
                  </Link>
                )}
                <StatusPill tone={p.is_current ? 'primary' : 'neutral'}>{p.role}</StatusPill>
                {p.is_current && <StatusPill tone="success">Current</StatusPill>}
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                Effective {formatDate(p.effective_start)}
                {p.effective_end && ` – ${formatDate(p.effective_end)}`}
                {p.party?.dl_number && ` · DL ${p.party.dl_number}`}
              </div>
            </div>
          </li>
        ))}
        {data.parties.length === 0 && <li className="py-6 text-sm text-on-surface-variant">No parties linked yet.</li>}
      </ul>
    </Card>
  )
}
