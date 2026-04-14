import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from '../ui/Drawer'
import { InputField } from '../ui/InputField'
import { Button } from '../ui/Button'
import { dataService } from '../../services/dataService'

interface Props { open: boolean; onClose: () => void; caseId: string }

export function RequestHearingDrawer({ open, onClose, caseId }: Props) {
  const qc = useQueryClient()
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await dataService.requestHearing(caseId, when || undefined)
    await qc.invalidateQueries({ queryKey: ['case', caseId] })
    setBusy(false)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Request hearing"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy}>{busy ? 'Submitting…' : 'Request hearing'}</Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <InputField
          label="Proposed date / time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-xs text-on-surface-variant">
          Leave blank to request a hearing without a specific time — court staff will schedule it.
        </p>
      </form>
    </Drawer>
  )
}
