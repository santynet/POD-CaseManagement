// Stubbed external integrations. Each has a typed interface and a mock
// implementation so the UI can work end-to-end. Replace with real
// HTTP/FTP clients later.

import { supabase } from '../lib/supabase'

export interface RegistrationLookupResult {
  found: boolean
  ownerName?: string
  ownerAddress?: string
  vehicle?: { make: string; model: string; year: number; color: string }
  source: 'RealTime' | 'FL Queue' | 'OOS Queue'
}

export const registrationLookupService = {
  async lookup(_plateNumber: string, state: string): Promise<RegistrationLookupResult> {
    await new Promise((r) => setTimeout(r, 400))
    const hit = Math.random() < 0.7
    if (hit) {
      return {
        found: true,
        ownerName: 'MOCK OWNER',
        ownerAddress: '1 Mock St, Miami FL 33131',
        vehicle: { make: 'Mock', model: 'Sedan', year: 2024, color: 'Silver' },
        source: 'RealTime',
      }
    }
    return { found: false, source: state === 'FL' ? 'FL Queue' : 'OOS Queue' }
  },
}

export const ftpQueueService = {
  async submit(params: { plateId: string; citationId: string; queue: 'FL' | 'OOS' }): Promise<void> {
    await new Promise((r) => setTimeout(r, 250))
    await supabase.from('lookup_queue_records').insert({
      plate_id: params.plateId,
      citation_id: params.citationId,
      queue_type: params.queue,
      result_status: 'Submitted',
    })
  },
}

export const noticeService = {
  async generate(params: {
    caseId: string
    noticeType: string
    deliveryMethod?: 'Mail' | 'Certified' | 'Email'
  }): Promise<void> {
    await new Promise((r) => setTimeout(r, 200))
    await supabase.from('notices').insert({
      case_id: params.caseId,
      notice_type: params.noticeType,
      delivery_method: params.deliveryMethod ?? 'Mail',
      status: 'Queued',
    })
  },
}
