import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dataService } from '../../services/dataService'
import { Card, SectionHeader } from '../../components/ui/Card'
import { Stepper } from '../../components/ui/Stepper'
import { Button } from '../../components/ui/Button'
import { InputField } from '../../components/ui/InputField'
import { SelectField } from '../../components/ui/SelectField'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatPartyName } from '../../lib/formatters'
import type { Party } from '../../domain/models'

const steps = [
  { label: 'Identify target' },
  { label: 'Reason & logic' },
  { label: 'Review & commit' },
]

const reasons = [
  { value: 'Vehicle sold',               label: 'Vehicle sold prior to incident' },
  { value: 'Rental / fleet driver',      label: 'Rental or fleet driver identified' },
  { value: 'Identity theft / stolen plate', label: 'Identity theft or stolen plate' },
  { value: 'Driver affidavit',           label: 'Driver affidavit submitted' },
]

export function TransferLiabilityPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => dataService.getCaseDetail(caseId!),
    enabled: !!caseId,
  })

  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Party | null>(null)
  const [reason, setReason] = useState(reasons[0].value)
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const searchQ = useQuery({
    queryKey: ['search', search],
    queryFn: () => dataService.globalSearch(search),
    enabled: search.length >= 2,
  })

  if (!data) return <EmptyState icon="error" title="Case not found" />

  const current = data.liableParty

  const onCommit = async () => {
    if (!current || !selected) return
    setBusy(true)
    await dataService.transferLiability({
      caseId: data.citation.id,
      fromPartyId: current.id,
      toPartyId: selected.id,
      reason,
      transferDate,
      notes: notes || undefined,
    })
    await qc.invalidateQueries({ queryKey: ['case', data.citation.id] })
    setBusy(false)
    navigate(`/cases/${data.citation.id}`)
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div>
        <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
          <Link to={`/cases/${data.citation.id}`} className="hover:text-primary">
            Case #{data.citation.citation_number}
          </Link>{' '}
          › Transfer Liability
        </div>
        <h1 className="text-display-sm font-extrabold text-on-surface tracking-tight">Transfer liability</h1>
      </div>

      <Card tone="lowest">
        <Stepper steps={steps} current={step} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {step === 0 && (
            <>
              <Card tone="lowest">
                <SectionHeader eyebrow="Current" title="Current liable party" />
                {current ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary flex items-center justify-center font-bold text-lg">
                      {formatPartyName(current)[0]}
                    </div>
                    <div>
                      <div className="font-bold text-on-surface">{formatPartyName(current)}</div>
                      <div className="text-xs text-on-surface-variant">
                        {current.dl_number ? `DL ${current.dl_number}` : 'No DL'} · {current.email ?? '—'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No current liable party.</p>
                )}
              </Card>

              <Card tone="lowest">
                <SectionHeader eyebrow="New party" title="Search or select" />
                <InputField
                  iconLeft="search"
                  placeholder="Search by name or DL number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {searchQ.data && searchQ.data.parties.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {searchQ.data.parties.slice(0, 8).map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => setSelected(p)}
                          className={`w-full text-left p-3 rounded-xl transition-colors ${
                            selected?.id === p.id
                              ? 'bg-primary/10 ring-2 ring-primary'
                              : 'bg-surface-container-low hover:bg-surface-container'
                          }`}
                        >
                          <div className="font-bold text-on-surface">{formatPartyName(p)}</div>
                          <div className="text-xs text-on-surface-variant">
                            {p.dl_number ? `DL ${p.dl_number}` : p.email ?? '—'}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {step === 1 && (
            <Card tone="lowest">
              <SectionHeader eyebrow="Why" title="Transfer reason & supporting info" />
              <div className="space-y-5">
                <SelectField
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  options={reasons}
                />
                <InputField
                  label="Transfer date"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
                <div>
                  <label className="text-label-sm uppercase tracking-wider font-semibold text-on-surface-variant block mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-surface-container-highest rounded-lg outline-none border-b-2 border-transparent focus:border-primary text-sm"
                    placeholder="Affidavit reference, supporting context…"
                  />
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card tone="lowest">
              <SectionHeader eyebrow="Confirm" title="Review & commit" />
              <dl className="space-y-3 text-sm">
                <Review label="From" value={current ? formatPartyName(current) : '—'} />
                <Review label="To"   value={selected ? formatPartyName(selected) : '—'} />
                <Review label="Reason" value={reason} />
                <Review label="Transfer date" value={transferDate} />
                {notes && <Review label="Notes" value={notes} />}
              </dl>
              <div className="mt-6 p-4 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined mr-2">info</span>
                On commit, a <strong>LiabilityTransferred</strong> docket entry will be written and the previous party
                will be preserved as historical. This cannot be undone automatically.
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4">
          <Card tone="lowest" className="sticky top-24">
            <SectionHeader eyebrow="Compliance" title="Pre-commit checks" />
            <ul className="space-y-3 text-sm">
              <Check done={!!current} label="Current party identified" />
              <Check done={!!selected} label="New party selected" />
              <Check done={step >= 1 && !!reason} label="Reason provided" />
              <Check done={step >= 1 && !!transferDate} label="Transfer date set" />
              <Check done={step === 2} label="Review step reached" />
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between sticky bottom-0 bg-background/80 backdrop-blur-md p-4 -mx-8 px-8 border-t border-outline-variant/20">
        <Button variant="ghost" onClick={() => navigate(`/cases/${data.citation.id}`)}>
          Discard
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
          )}
          {step < 2 && (
            <Button
              iconRight="arrow_forward"
              disabled={step === 0 && !selected}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button variant="primary" iconRight="check" onClick={onCommit} disabled={busy}>
              {busy ? 'Committing…' : 'Commit transfer'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{label}</dt>
      <dd className="text-on-surface font-semibold text-right">{value}</dd>
    </div>
  )
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`material-symbols-outlined text-lg ${
          done ? 'text-emerald-600' : 'text-on-surface-variant'
        }`}
      >
        {done ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <span className={done ? 'text-on-surface' : 'text-on-surface-variant'}>{label}</span>
    </li>
  )
}
