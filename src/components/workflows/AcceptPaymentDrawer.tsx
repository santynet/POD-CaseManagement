import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from '../ui/Drawer'
import { InputField } from '../ui/InputField'
import { SelectField } from '../ui/SelectField'
import { Button } from '../ui/Button'
import { dataService } from '../../services/dataService'

interface Props {
  open: boolean
  onClose: () => void
  caseId: string
  maxAmount: number
}

export function AcceptPaymentDrawer({ open, onClose, caseId, maxAmount }: Props) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(maxAmount))
  const [method, setMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await dataService.recordPayment(caseId, Number(amount), method, reference || undefined)
    await qc.invalidateQueries({ queryKey: ['case', caseId] })
    await qc.invalidateQueries({ queryKey: ['dashboard'] })
    setBusy(false)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Accept payment"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy}>{busy ? 'Posting…' : 'Post payment'}</Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <InputField label="Amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <SelectField
          label="Method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Credit Card', label: 'Credit Card' },
            { value: 'Check', label: 'Check' },
            { value: 'Web', label: 'Web' },
            { value: 'Phone', label: 'Phone' },
          ]}
        />
        <InputField label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Confirmation #, check #, etc." />
      </form>
    </Drawer>
  )
}
