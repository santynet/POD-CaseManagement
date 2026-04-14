import type { CaseDetail } from '../../domain/models'
import { Card, SectionHeader } from '../ui/Card'
import { formatCurrency, formatDate } from '../../lib/formatters'

export function FinancialsTab({ data }: { data: CaseDetail }) {
  let running = 0
  const rows = data.ledger.map((e) => {
    running += Number(e.debit) - Number(e.credit)
    return { ...e, running }
  })

  const totals = rows.reduce(
    (acc, r) => {
      acc.debit += Number(r.debit)
      acc.credit += Number(r.credit)
      return acc
    },
    { debit: 0, credit: 0 },
  )

  return (
    <Card tone="lowest" padding="none">
      <div className="p-6 border-b border-outline-variant/15">
        <SectionHeader eyebrow="Ledger" title="Financial history" />
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Metric label="Total charges" value={formatCurrency(totals.debit)} />
          <Metric label="Total payments" value={formatCurrency(totals.credit)} />
          <Metric label="Balance" value={formatCurrency(running)} emphasis={running > 0 ? 'error' : 'success'} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-8 text-center text-on-surface-variant">No ledger entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                <th
                  key={h}
                  className={`text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold px-5 py-3 ${
                    i >= 3 ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(r.entered_at)}</td>
                <td className="px-5 py-3 text-on-surface">{r.entry_type}</td>
                <td className="px-5 py-3 text-on-surface">{r.description}</td>
                <td className="px-5 py-3 text-right text-error font-semibold">
                  {Number(r.debit) > 0 ? formatCurrency(Number(r.debit)) : '—'}
                </td>
                <td className="px-5 py-3 text-right text-emerald-700 font-semibold">
                  {Number(r.credit) > 0 ? formatCurrency(Number(r.credit)) : '—'}
                </td>
                <td className="px-5 py-3 text-right font-black text-on-surface">
                  {formatCurrency(Number(r.running))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: 'error' | 'success' }) {
  return (
    <div>
      <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{label}</div>
      <div
        className={`text-2xl font-extrabold ${
          emphasis === 'error' ? 'text-error' : emphasis === 'success' ? 'text-emerald-700' : 'text-on-surface'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
