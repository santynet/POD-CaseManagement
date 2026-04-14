// Canonical TypeScript shapes for the POD domain.
// These mirror the Supabase schema but are the shapes UI code consumes.

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

export type PartyType = 'Person' | 'Company'

export type CasePartyRole = 'Liable' | 'Driver' | 'Owner' | 'Co-Liable' | 'Historical'

export type PlateLookupStatus = 'Found' | 'PendingFL' | 'PendingOOS' | 'Returned' | 'NotFound'

export type LedgerEntryType =
  | 'Fine'
  | 'CollectionFee'
  | 'CourtFee'
  | 'Payment'
  | 'Adjustment'
  | 'Waiver'
  | 'Refund'

export type DocketEventType =
  | 'CitationIssued'
  | 'CitationEntered'
  | 'PartyMatched'
  | 'LiabilityTransferred'
  | 'HearingRequested'
  | 'HearingDecisionEntered'
  | 'MotionRequested'
  | 'PaymentAccepted'
  | 'DocumentUploaded'
  | 'NoticeSent'
  | 'AddedToCollections'
  | 'RemovedFromCollections'
  | 'CollectionAgencyAssigned'
  | 'RegistrationHoldAdded'
  | 'RegistrationHoldRemoved'
  | 'TowOrderAdded'
  | 'TowOrderRemoved'

export type HoldType = 'RegistrationHold' | 'TowOrder'

export type QueueType = 'FL' | 'OOS'

export type QueueStatus = 'Submitted' | 'InProgress' | 'Returned' | 'Failed'

export type NoticeStatus = 'Draft' | 'Queued' | 'Sent' | 'Failed'

export type DeliveryMethod = 'Mail' | 'Certified' | 'Email'

export type DocumentCategory =
  | 'OfficerEvidence'
  | 'ViolatorSubmitted'
  | 'Notice'
  | 'HearingDecision'
  | 'TransferSupport'

export type HearingStatus = 'Requested' | 'Scheduled' | 'Held' | 'Decided' | 'Cancelled'

export type MotionStatus = 'Requested' | 'Granted' | 'Denied' | 'Withdrawn'

export interface Party {
  id: string
  party_type: PartyType
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  dob?: string | null
  dl_number?: string | null
  dl_state?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}

export interface Address {
  id: string
  party_id: string
  address_type: 'Mailing' | 'Residence' | 'Business' | 'Other'
  line1: string
  line2?: string | null
  city: string
  state: string
  postal_code: string
  effective_start: string
  effective_end?: string | null
  is_current: boolean
}

export interface Plate {
  id: string
  plate_number: string
  state: string
  plate_type?: string | null
  lookup_status: PlateLookupStatus
}

export interface Vehicle {
  id: string
  vin?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  body_style?: string | null
}

export interface PlateParty {
  id: string
  plate_id: string
  party_id?: string | null
  vehicle_id?: string | null
  effective_start: string
  effective_end?: string | null
  is_current: boolean
  plate?: Plate
  party?: Party | null
  vehicle?: Vehicle | null
}

export interface Citation {
  id: string
  citation_number: string
  violation_code: string
  violation_description: string
  location?: string | null
  incident_date: string
  entered_date: string
  due_date?: string | null
  issuing_officer?: string | null
  agency?: string | null
  plate_id?: string | null
  primary_status: CaseStatus
  secondary_disposition: CaseDisposition
  fine_amount: number
  balance: number
  is_in_collections: boolean
  has_registration_hold: boolean
  has_tow_order: boolean
  created_at: string
  updated_at: string
}

export interface CaseParty {
  id: string
  case_id: string
  party_id: string
  role: CasePartyRole
  effective_start: string
  effective_end?: string | null
  is_current: boolean
  party?: Party
}

export interface Hearing {
  id: string
  case_id: string
  requested_at: string
  scheduled_at?: string | null
  status: HearingStatus
  decision?: string | null
  decided_at?: string | null
}

export interface Motion {
  id: string
  case_id: string
  motion_type: string
  requested_at: string
  status: MotionStatus
  decision?: string | null
}

export interface LedgerEntry {
  id: string
  case_id: string
  entry_type: LedgerEntryType
  debit: number
  credit: number
  description: string
  entered_at: string
}

export interface DocketEntry {
  id: string
  case_id: string
  event_type: DocketEventType
  event_at: string
  description: string
  metadata: Record<string, unknown>
}

export interface Hold {
  id: string
  case_id: string
  hold_type: HoldType
  placed_at: string
  released_at?: string | null
  is_active: boolean
  reason?: string | null
}

export interface CollectionAssignment {
  id: string
  case_id: string
  agency_name: string
  assigned_at: string
  removed_at?: string | null
  is_active: boolean
}

export interface Notice {
  id: string
  case_id: string
  notice_type: string
  generated_at: string
  sent_at?: string | null
  delivery_method: DeliveryMethod
  status: NoticeStatus
}

export interface LookupQueueRecord {
  id: string
  plate_id: string
  citation_id?: string | null
  queue_type: QueueType
  submitted_at: string
  returned_at?: string | null
  result_status: QueueStatus
  plate?: Plate
}

export interface PodDocument {
  id: string
  case_id: string
  category: DocumentCategory
  filename: string
  mime_type?: string | null
  url?: string | null
  uploaded_at: string
}

// Composite shapes ------------------------------------------------------------

export interface CaseDetail {
  citation: Citation
  plate?: Plate | null
  vehicle?: Vehicle | null
  liableParty?: Party | null
  parties: CaseParty[]
  hearings: Hearing[]
  motions: Motion[]
  ledger: LedgerEntry[]
  docket: DocketEntry[]
  holds: Hold[]
  collections: CollectionAssignment[]
  notices: Notice[]
  documents: PodDocument[]
}

export interface PartyDetail {
  party: Party
  addresses: Address[]
  plateHistory: PlateParty[]
  relatedCases: Citation[]
}

export interface PlateDetail {
  plate: Plate
  history: PlateParty[]
  relatedCases: Citation[]
}

export interface SearchResults {
  citations: Citation[]
  parties: Party[]
  plates: Plate[]
}
