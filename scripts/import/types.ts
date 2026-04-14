// Types shared across the PVS importer.

export type CaseStatus = 'Open' | 'Closed' | 'Dismissed'

export type CaseDisposition =
  | 'Awaiting Court'
  | 'Payment Plan'
  | 'Hearing Requested'
  | 'Motion Requested'
  | 'In Collections'
  | 'Registration Hold'
  | 'Tow Order'
  | 'Paid'
  | 'Liability Transferred'
  | 'None'

export type LedgerEntryType =
  | 'Fine'
  | 'CollectionFee'
  | 'CourtFee'
  | 'Payment'
  | 'Adjustment'
  | 'Waiver'
  | 'Refund'

export type DocketEventType = 'CitationIssued' | 'CitationEntered'

export interface ParsedLedger {
  source_key: string
  entry_type: LedgerEntryType
  debit: number
  credit: number
  description: string
  entered_at: Date
}

export interface ParsedDocket {
  source_key: string
  event_type: DocketEventType
  event_at: Date
  description: string
  metadata: Record<string, unknown>
}

export interface ParsedPlate {
  plate_number: string
  state: string
  lookup_status: 'Found' | 'NotFound'
}

export interface ParsedCitation {
  citation_number: string
  violation_code: string
  violation_description: string
  ordinance_or_statute: string | null
  location: string | null
  incident_date: Date
  entered_date: Date
  notice_date: Date | null
  disposition_date: Date | null
  court_date: Date | null
  closed_date: Date | null
  due_date: Date | null
  issuing_officer: string | null
  agency: string | null
  primary_status: CaseStatus
  secondary_disposition: CaseDisposition
  fine_amount: number
  balance: number
  is_in_collections: boolean
  has_registration_hold: boolean
  has_tow_order: boolean
  vehicle_make: string | null
  vehicle_body_style: string | null
  vehicle_color: string | null
  vehicle_year: number | null
  legacy_source: string
  legacy_disposition_code: string | null
  legacy_operator_id: string | null
  legacy_municipality_code: string | null
  legacy_raw: Record<string, string>
}

export interface ParsedRow {
  lineNumber: number
  plate: ParsedPlate
  citation: ParsedCitation
  ledger: ParsedLedger[]
  docket: ParsedDocket[]
}

export type ColMap = Record<string, number>
