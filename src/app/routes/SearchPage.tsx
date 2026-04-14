import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { Card } from '../../components/ui/Card'
import { InputField } from '../../components/ui/InputField'
import { StatusPill, statusTone, dispositionTone } from '../../components/ui/StatusPill'
import { formatCurrency, formatDate, formatPartyName } from '../../lib/formatters'
import { EmptyState } from '../../components/ui/EmptyState'

type Tab = 'citations' | 'parties' | 'plates'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') ?? ''
  const [q, setQ] = useState(initialQ)
  const [tab, setTab] = useState<Tab>('citations')

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  const { data, isLoading } = useQuery({
    queryKey: ['search', initialQ],
    queryFn: () => dataService.globalSearch(initialQ),
    enabled: !!initialQ,
  })

  const counts = useMemo(
    () => ({
      citations: data?.citations.length ?? 0,
      parties: data?.parties.length ?? 0,
      plates: data?.plates.length ?? 0,
    }),
    [data],
  )

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Search</div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">Global search</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setParams({ q })
        }}
        className="mb-6"
      >
        <InputField
          iconLeft="search"
          placeholder="Citation #, plate, party name, or DL number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {!initialQ && (
        <EmptyState
          icon="manage_search"
          title="Start typing to search"
          description="Look up by citation number, plate/tag, party name, or driver's license."
        />
      )}

      {initialQ && (
        <>
          <div className="flex items-center gap-2 mb-4">
            {(['citations', 'parties', 'plates'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}{' '}
                <span className={tab === t ? 'text-on-primary/80' : 'text-outline'}>
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>

          {isLoading && <p className="text-on-surface-variant">Searching…</p>}

          {tab === 'citations' && (
            <Card tone="lowest" padding="none">
              {(data?.citations ?? []).length === 0 && !isLoading ? (
                <EmptyState icon="description" title="No citations" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Citation #', 'Violation', 'Issue Date', 'Status', 'Disposition', 'Balance'].map((h) => (
                        <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.citations ?? []).map((c) => (
                      <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-5 py-3.5">
                          <Link to={`/cases/${c.id}`} className="font-bold text-primary hover:underline">
                            #{c.citation_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-on-surface">{c.violation_description}</td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{formatDate(c.incident_date)}</td>
                        <td className="px-5 py-3.5">
                          <StatusPill tone={statusTone(c.primary_status)}>{c.primary_status}</StatusPill>
                        </td>
                        <td className="px-5 py-3.5">
                          {c.secondary_disposition !== 'None' && (
                            <StatusPill tone={dispositionTone(c.secondary_disposition)}>
                              {c.secondary_disposition}
                            </StatusPill>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-on-surface text-right">
                          {formatCurrency(Number(c.balance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === 'parties' && (
            <Card tone="lowest" padding="none">
              {(data?.parties ?? []).length === 0 && !isLoading ? (
                <EmptyState icon="person" title="No parties" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Name', 'Type', 'DL #', 'Phone', 'Email'].map((h) => (
                        <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.parties ?? []).map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-5 py-3.5">
                          <Link to={`/parties/${p.id}`} className="font-bold text-primary hover:underline">
                            {formatPartyName(p)}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.party_type}</td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.dl_number ?? '—'}</td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.phone ?? '—'}</td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.email ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === 'plates' && (
            <Card tone="lowest" padding="none">
              {(data?.plates ?? []).length === 0 && !isLoading ? (
                <EmptyState icon="directions_car" title="No plates" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Plate', 'State', 'Type', 'Lookup Status'].map((h) => (
                        <th key={h} className="text-label-sm uppercase tracking-wider text-on-surface-variant text-left px-5 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.plates ?? []).map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-5 py-3.5">
                          <Link to={`/plates/${p.id}`} className="font-bold text-primary hover:underline">
                            {p.plate_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.state}</td>
                        <td className="px-5 py-3.5 text-on-surface-variant">{p.plate_type ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <StatusPill tone={p.lookup_status === 'Found' ? 'success' : 'warning'}>
                            {p.lookup_status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
