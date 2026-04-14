import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from '../ui/Drawer'
import { SelectField } from '../ui/SelectField'
import { Button } from '../ui/Button'
import { dataService } from '../../services/dataService'

interface Props { open: boolean; onClose: () => void; caseId: string }

export function RequestMotionDrawer({ open, onClose, caseId }: Props) {
  const qc = useQueryClient()
  const [motionType, setMotionType] = useState('Motion to Dismiss')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await dataService.requestMotion(caseId, motionType)
    await qc.invalidateQueries({ queryKey: ['case', caseId] })
    setBusy(false)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="File motion"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy}>{busy ? 'Filing…' : 'File motion'}</Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <SelectField
          label="Motion type"
          value={motionType}
          onChange={(e) => setMotionType(e.target.value)}
          options={[
            { value: 'Motion to Dismiss', label: 'Motion to Dismiss' },
            { value: 'Motion for Continuance', label: 'Motion for Continuance' },
            { value: 'Motion to Reduce', label: 'Motion to Reduce' },
            { value: 'Motion to Reconsider', label: 'Motion to Reconsider' },
          ]}
        />
      </form>
    </Drawer>
  )
}
