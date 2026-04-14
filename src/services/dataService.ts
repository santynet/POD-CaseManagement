import { supabase } from '../lib/supabase'
import type {
  CaseDetail,
  Citation,
  DocketEntry,
  LedgerEntry,
  LookupQueueRecord,
  Notice,
  Party,
  PartyDetail,
  Plate,
  PlateDetail,
  SearchResults,
} from '../domain/models'

// Thin, typed Supabase wrapper. All UI code goes through this interface so
// swapping to a .NET API in the future only touches this file.

async function fetchCitationById(id: string): Promise<Citation | null> {
  const { data, error } = await supabase.from('citations').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Citation | null
}

async function fetchCitationByNumber(number: string): Promise<Citation | null> {
  const { data, error } = await supabase
    .from('citations')
    .select('*')
    .eq('citation_number', number)
    .maybeSingle()
  if (error) throw error
  return data as Citation | null
}

export const dataService = {
  // ---------- Dashboard ----------
  async dashboardStats() {
    const [open, collections, queues, notices] = await Promise.all([
      supabase.from('citations').select('id,balance', { count: 'exact' }).eq('primary_status', 'Open'),
      supabase.from('citations').select('id', { count: 'exact' }).eq('is_in_collections', true),
      supabase.from('lookup_queue_records').select('id', { count: 'exact' }).neq('result_status', 'Returned'),
      supabase.from('notices').select('id', { count: 'exact' }).eq('status', 'Queued'),
    ])
    const totalOutstanding = (open.data ?? []).reduce((sum, r: any) => sum + Number(r.balance ?? 0), 0)
    return {
      openCases: open.count ?? 0,
      inCollections: collections.count ?? 0,
      pendingLookups: queues.count ?? 0,
      queuedNotices: notices.count ?? 0,
      totalOutstanding,
    }
  },

  // ---------- Search ----------
  async globalSearch(query: string): Promise<SearchResults> {
    const q = query.trim()
    if (!q) return { citations: [], parties: [], plates: [] }
    const like = `%${q}%`

    const [citationsByNumber, parties, plates] = await Promise.all([
      supabase
        .from('citations')
        .select('*')
        .ilike('citation_number', like)
        .order('entered_date', { ascending: false })
        .limit(50),
      supabase
        .from('parties')
        .select('*')
        .or(
          `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},dl_number.ilike.${like}`,
        )
        .limit(50),
      supabase.from('plates').select('*').ilike('plate_number', like).limit(50),
    ])

    // For citations matched via a plate, pull those too.
    let citationsByPlate: Citation[] = []
    if ((plates.data ?? []).length > 0) {
      const ids = plates.data!.map((p) => p.id)
      const { data } = await supabase
        .from('citations')
        .select('*')
        .in('plate_id', ids)
        .order('entered_date', { ascending: false })
        .limit(50)
      citationsByPlate = (data ?? []) as Citation[]
    }

    // Combine and dedupe citations by id.
    const seen = new Set<string>()
    const citations = [...((citationsByNumber.data ?? []) as Citation[]), ...citationsByPlate].filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    return {
      citations,
      parties: (parties.data ?? []) as Party[],
      plates: (plates.data ?? []) as Plate[],
    }
  },

  // ---------- Case detail ----------
  async getCaseDetail(citationId: string): Promise<CaseDetail | null> {
    const citation = await fetchCitationById(citationId)
    if (!citation) return null

    const [plate, partiesRes, hearings, motions, ledger, docket, holds, collections, notices, documents] =
      await Promise.all([
        citation.plate_id
          ? supabase.from('plates').select('*').eq('id', citation.plate_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('case_party')
          .select('*, party:parties(*)')
          .eq('case_id', citationId)
          .order('is_current', { ascending: false }),
        supabase.from('hearings').select('*').eq('case_id', citationId).order('requested_at', { ascending: false }),
        supabase.from('motions').select('*').eq('case_id', citationId).order('requested_at', { ascending: false }),
        supabase.from('ledger_entries').select('*').eq('case_id', citationId).order('entered_at'),
        supabase.from('docket_entries').select('*').eq('case_id', citationId).order('event_at', { ascending: false }),
        supabase.from('holds').select('*').eq('case_id', citationId),
        supabase.from('collection_assignments').select('*').eq('case_id', citationId),
        supabase.from('notices').select('*').eq('case_id', citationId).order('generated_at', { ascending: false }),
        supabase.from('documents').select('*').eq('case_id', citationId).order('uploaded_at', { ascending: false }),
      ])

    // Find the current liable party.
    const parties = (partiesRes.data ?? []) as any[]
    const liable = parties.find((p) => p.is_current && p.role === 'Liable')

    // Pull the current vehicle for the plate (if any).
    let vehicle = null
    if (plate?.data?.id) {
      const { data: pp } = await supabase
        .from('plate_party')
        .select('vehicle:vehicles(*)')
        .eq('plate_id', plate.data.id)
        .eq('is_current', true)
        .maybeSingle()
      const v = (pp as any)?.vehicle
      vehicle = Array.isArray(v) ? v[0] ?? null : v ?? null
    }

    return {
      citation,
      plate: plate?.data ?? null,
      vehicle,
      liableParty: liable?.party ?? null,
      parties,
      hearings: (hearings.data ?? []) as any[],
      motions: (motions.data ?? []) as any[],
      ledger: (ledger.data ?? []) as any[],
      docket: (docket.data ?? []) as any[],
      holds: (holds.data ?? []) as any[],
      collections: (collections.data ?? []) as any[],
      notices: (notices.data ?? []) as any[],
      documents: (documents.data ?? []) as any[],
    }
  },

  async getCaseByNumber(citationNumber: string): Promise<Citation | null> {
    return fetchCitationByNumber(citationNumber)
  },

  async relatedCasesByParty(partyId: string, excludeCaseId?: string): Promise<Citation[]> {
    const { data, error } = await supabase
      .from('case_party')
      .select('case:citations(*)')
      .eq('party_id', partyId)
    if (error) throw error
    const cases = ((data ?? []).map((r: any) => r.case).filter(Boolean) as Citation[])
      .filter((c) => c.id !== excludeCaseId)
    // Dedupe.
    const seen = new Set<string>()
    return cases.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
  },

  async relatedCasesByPlate(plateId: string, excludeCaseId?: string): Promise<Citation[]> {
    const { data, error } = await supabase
      .from('citations')
      .select('*')
      .eq('plate_id', plateId)
    if (error) throw error
    return ((data ?? []) as Citation[]).filter((c) => c.id !== excludeCaseId)
  },

  // ---------- Party detail ----------
  async getPartyDetail(partyId: string): Promise<PartyDetail | null> {
    const { data: party } = await supabase.from('parties').select('*').eq('id', partyId).maybeSingle()
    if (!party) return null

    const [addresses, plateHistory, relatedCases] = await Promise.all([
      supabase.from('addresses').select('*').eq('party_id', partyId).order('effective_start', { ascending: false }),
      supabase
        .from('plate_party')
        .select('*, plate:plates(*), vehicle:vehicles(*)')
        .eq('party_id', partyId)
        .order('is_current', { ascending: false }),
      this.relatedCasesByParty(partyId),
    ])

    return {
      party: party as Party,
      addresses: (addresses.data ?? []) as any[],
      plateHistory: (plateHistory.data ?? []) as any[],
      relatedCases,
    }
  },

  // ---------- Plate detail ----------
  async getPlateDetail(plateId: string): Promise<PlateDetail | null> {
    const { data: plate } = await supabase.from('plates').select('*').eq('id', plateId).maybeSingle()
    if (!plate) return null

    const [history, relatedCases] = await Promise.all([
      supabase
        .from('plate_party')
        .select('*, plate:plates(*), party:parties(*), vehicle:vehicles(*)')
        .eq('plate_id', plateId)
        .order('effective_start', { ascending: false }),
      this.relatedCasesByPlate(plateId),
    ])

    return {
      plate: plate as Plate,
      history: (history.data ?? []) as any[],
      relatedCases,
    }
  },

  // ---------- Mutations ----------
  async appendDocket(entry: {
    caseId: string
    eventType: DocketEntry['event_type']
    description: string
    metadata?: Record<string, unknown>
  }): Promise<DocketEntry> {
    const { data, error } = await supabase
      .from('docket_entries')
      .insert({
        case_id: entry.caseId,
        event_type: entry.eventType,
        description: entry.description,
        metadata: entry.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data as DocketEntry
  },

  async recordPayment(caseId: string, amount: number, method = 'Cash', reference?: string): Promise<void> {
    const { data: citation } = await supabase.from('citations').select('*').eq('id', caseId).single()
    if (!citation) throw new Error('Case not found')

    await supabase.from('payments').insert({ case_id: caseId, amount, method, reference })
    await supabase.from('ledger_entries').insert({
      case_id: caseId,
      entry_type: 'Payment',
      debit: 0,
      credit: amount,
      description: `Payment received — ${method}${reference ? ` (${reference})` : ''}`,
    })
    const newBalance = Math.max(0, Number(citation.balance) - amount)
    const patch: Partial<Citation> = { balance: newBalance }
    if (newBalance === 0) {
      patch.primary_status = 'Closed'
      patch.secondary_disposition = 'Paid'
    }
    await supabase.from('citations').update(patch).eq('id', caseId)
    await this.appendDocket({
      caseId,
      eventType: 'PaymentAccepted',
      description: `Payment of $${amount.toFixed(2)} accepted via ${method}`,
      metadata: { amount, method, reference },
    })
  },

  async requestHearing(caseId: string, scheduledAt?: string): Promise<void> {
    await supabase.from('hearings').insert({
      case_id: caseId,
      scheduled_at: scheduledAt ?? null,
      status: scheduledAt ? 'Scheduled' : 'Requested',
    })
    await supabase
      .from('citations')
      .update({ secondary_disposition: 'Hearing Requested' })
      .eq('id', caseId)
    await this.appendDocket({
      caseId,
      eventType: 'HearingRequested',
      description: scheduledAt ? `Hearing scheduled for ${scheduledAt}` : 'Hearing requested',
    })
  },

  async requestMotion(caseId: string, motionType: string): Promise<void> {
    await supabase.from('motions').insert({ case_id: caseId, motion_type: motionType })
    await supabase
      .from('citations')
      .update({ secondary_disposition: 'Motion Requested' })
      .eq('id', caseId)
    await this.appendDocket({
      caseId,
      eventType: 'MotionRequested',
      description: `Motion filed: ${motionType}`,
    })
  },

  async transferLiability(params: {
    caseId: string
    fromPartyId: string
    toPartyId: string
    reason: string
    transferDate: string
    notes?: string
  }): Promise<void> {
    const { caseId, fromPartyId, toPartyId, reason, transferDate, notes } = params

    // Mark the old liable party as historical.
    await supabase
      .from('case_party')
      .update({ is_current: false, role: 'Historical', effective_end: transferDate })
      .eq('case_id', caseId)
      .eq('party_id', fromPartyId)
      .eq('is_current', true)

    // Insert the new liable party.
    await supabase.from('case_party').insert({
      case_id: caseId,
      party_id: toPartyId,
      role: 'Liable',
      effective_start: transferDate,
      is_current: true,
    })

    // Flag on the citation for quick filters.
    await supabase
      .from('citations')
      .update({ secondary_disposition: 'Liability Transferred' })
      .eq('id', caseId)

    await this.appendDocket({
      caseId,
      eventType: 'LiabilityTransferred',
      description: `Liability transferred — ${reason}${notes ? `. Notes: ${notes}` : ''}`,
      metadata: { fromPartyId, toPartyId, reason, transferDate, notes: notes ?? null },
    })
  },

  // ---------- Queues / notices ----------
  async listQueue(queueType: 'FL' | 'OOS'): Promise<LookupQueueRecord[]> {
    const { data, error } = await supabase
      .from('lookup_queue_records')
      .select('*, plate:plates(*)')
      .eq('queue_type', queueType)
      .order('submitted_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as any[]
  },

  async listNotices(): Promise<Notice[]> {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as Notice[]
  },

  async listLedger(caseId: string): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('entered_at')
    if (error) throw error
    return (data ?? []) as LedgerEntry[]
  },

  async listDocket(caseId: string): Promise<DocketEntry[]> {
    const { data, error } = await supabase
      .from('docket_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('event_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as DocketEntry[]
  },
}
