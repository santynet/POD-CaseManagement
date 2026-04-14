import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { FinancialsTab } from '../../components/case/FinancialsTab'
import { DocketTab } from '../../components/case/DocketTab'
import { EmptyState } from '../../components/ui/EmptyState'

export function LedgerDocketPage() {
  const { caseId } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => dataService.getCaseDetail(caseId!),
    enabled: !!caseId,
  })

  if (isLoading) return <p className="text-on-surface-variant">Loading…</p>
  if (!data) return <EmptyState icon="error" title="Case not found" />

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          <Link to={`/cases/${data.citation.id}`} className="hover:text-primary">
            Case #{data.citation.citation_number}
          </Link>{' '}
          › Ledger & Docket
        </div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">
          Financial history & activity
        </h1>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <FinancialsTab data={data} />
        </div>
        <div className="xl:col-span-5">
          <DocketTab data={data} />
        </div>
      </div>
    </div>
  )
}
