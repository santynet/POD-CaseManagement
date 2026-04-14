import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { CaseHeader } from '../../components/case/CaseHeader'
import { CaseTabs, type CaseTab } from '../../components/case/CaseTabs'
import { OverviewTab } from '../../components/case/OverviewTab'
import { FinancialsTab } from '../../components/case/FinancialsTab'
import { DocketTab } from '../../components/case/DocketTab'
import { PartiesTab } from '../../components/case/PartiesTab'
import { PlateTab, HearingsTab, DocumentsTab, CollectionsTab } from '../../components/case/SimpleTabs'
import { AcceptPaymentDrawer } from '../../components/workflows/AcceptPaymentDrawer'
import { RequestHearingDrawer } from '../../components/workflows/RequestHearingDrawer'
import { RequestMotionDrawer } from '../../components/workflows/RequestMotionDrawer'
import { EmptyState } from '../../components/ui/EmptyState'

export function CaseDetailPage() {
  const { caseId } = useParams()
  const [tab, setTab] = useState<CaseTab>('overview')
  const [payOpen, setPayOpen] = useState(false)
  const [hearOpen, setHearOpen] = useState(false)
  const [motOpen, setMotOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => dataService.getCaseDetail(caseId!),
    enabled: !!caseId,
  })

  if (isLoading) return <p className="text-on-surface-variant">Loading case…</p>
  if (!data) return <EmptyState icon="error" title="Case not found" />

  return (
    <div className="max-w-[1400px] mx-auto">
      <CaseHeader
        data={data}
        onAcceptPayment={() => setPayOpen(true)}
        onRequestHearing={() => setHearOpen(true)}
        onRequestMotion={() => setMotOpen(true)}
      />

      <CaseTabs value={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'parties' && <PartiesTab data={data} />}
      {tab === 'plate' && <PlateTab data={data} />}
      {tab === 'financials' && <FinancialsTab data={data} />}
      {tab === 'hearings' && <HearingsTab data={data} />}
      {tab === 'documents' && <DocumentsTab data={data} />}
      {tab === 'docket' && <DocketTab data={data} />}
      {tab === 'collections' && <CollectionsTab data={data} />}

      <AcceptPaymentDrawer
        open={payOpen}
        onClose={() => setPayOpen(false)}
        caseId={data.citation.id}
        maxAmount={Number(data.citation.balance)}
      />
      <RequestHearingDrawer open={hearOpen} onClose={() => setHearOpen(false)} caseId={data.citation.id} />
      <RequestMotionDrawer open={motOpen} onClose={() => setMotOpen(false)} caseId={data.citation.id} />
    </div>
  )
}
