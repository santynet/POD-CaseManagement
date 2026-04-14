import type { ColMap, ParsedDocket, ParsedLedger, ParsedRow } from './types'
import { resolvePlate } from './resolvePlate'
import { mapDisposition } from './mapDisposition'

export const PVS_COLUMNS = [
  'PVS-TAG-LICENSE', 'PVS-TAG-STATE', 'PVS-CAS-CITATION-NO',
  'PVS-CAS-ISSUE-DATE', 'PVS-CAS-ENTRY-DATE', 'PVS-CAS-NOTICE-DATE',
  'PVS-CAS-DISP-DATE', 'PVS-CAS-COURT-DATE', 'PVS-CAS-CLOSED-DATE',
  'PVS-CAS-FINE-ASSD', 'PVS-CAS-COST-ASSD', 'PVS-CAS-SCHRG-ASSD',
  'PVS-CAS-AMT-PAID', 'PVS-CAS-FINE-PAID', 'PVS-CAS-COST-PAID',
  'PVS-CAS-SCHRG-PAID', 'PVS-CAS-MISC-PAID', 'PVS-CAS-CFEE-ASSD',
  'PVS-CAS-CFEE-PAID', 'PVS-CAS-NOTICE-FLAG', 'PVS-CAS-PENALTY-FLAG',
  'PVS-CAS-PAID-AT', 'PVS-CAS-JUDGE', 'PVS-CAS-HH-DEVICE-ID',
  'PVS-CAS-MUNICIPALITY', 'PVS-CAS-ZONE', 'PVS-CAS-VIOLATION',
  'PVS-CAS-DISPOSITION', 'PVS-CAS-OPERATOR-ID', 'PVS-CAS-PYMT-BAPBH-NBR',
  'PVS-CAS-RECEIPT-NUM', 'PVS-CAS-DISTR-FLAG', 'PVS-CAS-IMAGE-INDEX-FORMAT',
  'PVS-CAS-MICROFILM-INDEX', 'PVS-CAS-HH-TIME-ISSUED', 'PVS-CAS-HH-METER-NBR',
  'PVS-CAS-HH-DECAL-EXP', 'PVS-CAS-HH-DECAL-NBR', 'PVS-CAS-HH-VEH-STYLE',
  'PVS-CAS-HH-VEH-MAKE', 'PVS-CAS-HH-VEH-COLOR-1', 'PVS-CAS-HH-VEH-COLOR-2',
  'PVS-CAS-HH-VIO-LOCATION', 'PVS-CAS-HH-VIO-STATUTE', 'PVS-CAS-HH-OFFICER-MUN',
  'PVS-CAS-HH-OFFICER-AGENCY', 'PVS-CAS-HH-OFFICER-NBR', 'PVS-CAS-COURT-TIME',
  'PVS-CAS-SUBPOENA-FLAG', 'PVS-CAS-PYMT-LOCATION', 'PVS-CAS-PYMT-TERMINAL-ID',
  'PVS-CAS-AGENCY-CODE', 'PVS-CAS-COURT-LOCATION-CODE', 'PVS-CAS-COURT-DISP',
  'PVS-CAS-COURT-DISP-DATE', 'PVS-CAS-COURT-DISP-DUE-DATE',
  'PVS-CAS-COURT-FINE-ASSD', 'PVS-CAS-COURT-COST-ASSD', 'PVS-CAS-LAST-CHGD-ID',
  'PVS-CAS-LAST-CHGD-DATE', 'PVS-CAS-LAST-CHGD-TIME', 'PVS-CAS-LAST-CHGD-TERM',
  'PVS-CAS-LAST-CHGD-PGM', 'PVS-CAS-METER-STATUS', 'PVS-CAS-COLL-AGENCY-CODE',
  'PVS-CAS-COLL-ACTION-CODE', 'PVS-CAS-COLL-ACTION-DATE',
  'PVS-CAS-MUNCAN-STATUS', 'PVS-CAS-LPR-FLG',
  'PVS-CAS-ORIGIN-TAG-LICENSE', 'PVS-CAS-ORIGIN-TAG-STATE',
] as const

export function parseHeader(headerLine: string): ColMap {
  const tokens = headerLine.split('\t').map((s) => s.trim())
  const map: ColMap = {}
  tokens.forEach((name, idx) => {
    map[name] = idx
  })
  for (const required of PVS_COLUMNS) {
    if (!(required in map)) {
      throw new Error(`Missing required column in header: ${required}`)
    }
  }
  return map
}

function col(tokens: string[], map: ColMap, name: string): string {
  const idx = map[name]
  return idx === undefined ? '' : (tokens[idx] ?? '').trim()
}

function parseDate(raw: string): Date | null {
  const v = raw.trim()
  if (!v || v === '00000000') return null
  // YYYYMMDD
  const y = Number(v.slice(0, 4))
  const m = Number(v.slice(4, 6))
  const d = Number(v.slice(6, 8))
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function parseDateTime(rawDate: string, rawTime: string): Date | null {
  const d = parseDate(rawDate)
  if (!d) return null
  const t = rawTime.trim().padStart(4, '0')
  if (t === '0000' || t.length !== 4) return d
  const hh = Number(t.slice(0, 2))
  const mm = Number(t.slice(2, 4))
  if (Number.isFinite(hh) && Number.isFinite(mm)) {
    d.setUTCHours(hh, mm, 0, 0)
  }
  return d
}

function parseMoney(raw: string): number {
  const v = raw.trim()
  if (!v) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function stripLeadingZeros(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  return v.replace(/^0+/, '') || '0'
}

function nonEmpty<T>(s: T | null | undefined): s is T {
  return s !== null && s !== undefined && (typeof s !== 'string' || s.length > 0)
}

/**
 * Transform a parsed tab-delimited row into a ParsedRow ready for batch upsert.
 */
export function parsePvsRow(
  tokens: string[],
  colMap: ColMap,
  options: { lineNumber: number; source: string; importDate: Date },
): ParsedRow {
  const { lineNumber, source, importDate } = options

  const citationNumber = col(tokens, colMap, 'PVS-CAS-CITATION-NO')
  if (!citationNumber) {
    throw new Error(`line ${lineNumber}: missing citation number`)
  }

  const plate = resolvePlate({
    pvsTagLicense: col(tokens, colMap, 'PVS-TAG-LICENSE'),
    pvsTagState: col(tokens, colMap, 'PVS-TAG-STATE'),
    hhDecalNbr: col(tokens, colMap, 'PVS-CAS-HH-DECAL-NBR'),
    originTagLicense: col(tokens, colMap, 'PVS-CAS-ORIGIN-TAG-LICENSE'),
    originTagState: col(tokens, colMap, 'PVS-CAS-ORIGIN-TAG-STATE'),
  })

  const incident_date =
    parseDateTime(col(tokens, colMap, 'PVS-CAS-ISSUE-DATE'), col(tokens, colMap, 'PVS-CAS-HH-TIME-ISSUED')) ??
    new Date(0)

  const entered_date = parseDate(col(tokens, colMap, 'PVS-CAS-ENTRY-DATE')) ?? incident_date
  const notice_date = parseDate(col(tokens, colMap, 'PVS-CAS-NOTICE-DATE'))
  const disposition_date = parseDate(col(tokens, colMap, 'PVS-CAS-DISP-DATE'))
  const court_date = parseDate(col(tokens, colMap, 'PVS-CAS-COURT-DATE'))
  const closed_date = parseDate(col(tokens, colMap, 'PVS-CAS-CLOSED-DATE'))

  const fineAssd = parseMoney(col(tokens, colMap, 'PVS-CAS-FINE-ASSD'))
  const costAssd = parseMoney(col(tokens, colMap, 'PVS-CAS-COST-ASSD'))
  const schrgAssd = parseMoney(col(tokens, colMap, 'PVS-CAS-SCHRG-ASSD'))
  const cfeeAssd = parseMoney(col(tokens, colMap, 'PVS-CAS-CFEE-ASSD'))
  const amtPaid = parseMoney(col(tokens, colMap, 'PVS-CAS-AMT-PAID'))
  const cfeePaid = parseMoney(col(tokens, colMap, 'PVS-CAS-CFEE-PAID'))

  const totalAssessed = fineAssd + costAssd + schrgAssd + cfeeAssd
  const totalPaid = amtPaid + cfeePaid

  const dispositionRaw = col(tokens, colMap, 'PVS-CAS-DISPOSITION')
  const disp = mapDisposition({
    rawCode: dispositionRaw,
    closedDate: closed_date,
    totalAssessed,
    totalPaid,
  })

  const balance =
    disp.primary_status === 'Open' ? Math.max(0, totalAssessed - totalPaid) : 0

  const statute = col(tokens, colMap, 'PVS-CAS-HH-VIO-STATUTE') || null
  const violationCode = stripLeadingZeros(col(tokens, colMap, 'PVS-CAS-VIOLATION')) || '0'
  const location = col(tokens, colMap, 'PVS-CAS-HH-VIO-LOCATION') || null

  const officerParts = [
    col(tokens, colMap, 'PVS-CAS-HH-OFFICER-MUN'),
    col(tokens, colMap, 'PVS-CAS-HH-OFFICER-AGENCY'),
    col(tokens, colMap, 'PVS-CAS-HH-OFFICER-NBR'),
  ].filter((s) => s.length > 0)
  const issuing_officer = officerParts.length ? officerParts.join(' / ') : null

  const vehicleYearRaw = col(tokens, colMap, 'PVS-CAS-HH-DECAL-EXP')
  const vehicle_year_n = Number(vehicleYearRaw)
  const vehicle_year = Number.isFinite(vehicle_year_n) && vehicle_year_n > 0 ? vehicle_year_n : null

  // Raw dump — everything, keyed by source column name, for audit.
  const legacy_raw: Record<string, string> = {}
  for (const name of PVS_COLUMNS) legacy_raw[name] = col(tokens, colMap, name)

  // Synthesize ledger entries. Only non-zero amounts.
  const ledger: ParsedLedger[] = []
  const ledgerDate = entered_date
  if (fineAssd > 0) {
    ledger.push({
      source_key: 'pvs:fine',
      entry_type: 'Fine',
      debit: fineAssd,
      credit: 0,
      description: `Fine assessed — ${statute ?? violationCode}`,
      entered_at: ledgerDate,
    })
  }
  if (costAssd > 0) {
    ledger.push({
      source_key: 'pvs:cost',
      entry_type: 'CourtFee',
      debit: costAssd,
      credit: 0,
      description: 'Court cost assessed',
      entered_at: ledgerDate,
    })
  }
  if (schrgAssd > 0) {
    ledger.push({
      source_key: 'pvs:schrg',
      entry_type: 'Adjustment',
      debit: schrgAssd,
      credit: 0,
      description: 'Surcharge assessed',
      entered_at: ledgerDate,
    })
  }
  if (cfeeAssd > 0) {
    ledger.push({
      source_key: 'pvs:cfee',
      entry_type: 'CollectionFee',
      debit: cfeeAssd,
      credit: 0,
      description: 'Collection fee assessed',
      entered_at: ledgerDate,
    })
  }
  const paymentDate = disposition_date ?? closed_date ?? entered_date
  if (amtPaid > 0) {
    ledger.push({
      source_key: 'pvs:payment',
      entry_type: 'Payment',
      debit: 0,
      credit: amtPaid,
      description: 'Payment received (legacy)',
      entered_at: paymentDate,
    })
  }
  if (cfeePaid > 0) {
    ledger.push({
      source_key: 'pvs:cfee_payment',
      entry_type: 'Payment',
      debit: 0,
      credit: cfeePaid,
      description: 'Collection fee payment (legacy)',
      entered_at: paymentDate,
    })
  }

  // Synthesize the two docket entries.
  const docket: ParsedDocket[] = [
    {
      source_key: 'pvs:issued',
      event_type: 'CitationIssued',
      event_at: incident_date,
      description: `Citation issued${statute ? ` (${statute})` : ''}${location ? ` at ${location}` : ''}`,
      metadata: { statute, location, officer: issuing_officer },
    },
    {
      source_key: 'pvs:entered',
      event_type: 'CitationEntered',
      event_at: entered_date,
      description: `Imported from ${source} on ${importDate.toISOString().slice(0, 10)}`,
      metadata: { source, lineNumber },
    },
  ]

  return {
    lineNumber,
    plate,
    citation: {
      citation_number: citationNumber,
      violation_code: violationCode,
      violation_description: statute ?? `Violation ${violationCode}`,
      ordinance_or_statute: statute,
      location,
      incident_date,
      entered_date,
      notice_date,
      disposition_date,
      court_date,
      closed_date,
      due_date: null,
      issuing_officer,
      agency: col(tokens, colMap, 'PVS-CAS-AGENCY-CODE') || null,
      primary_status: disp.primary_status,
      secondary_disposition: disp.secondary_disposition,
      fine_amount: fineAssd,
      balance,
      is_in_collections: cfeeAssd > 0 || col(tokens, colMap, 'PVS-CAS-COLL-AGENCY-CODE').length > 0,
      has_registration_hold: false,
      has_tow_order: false,
      vehicle_make: col(tokens, colMap, 'PVS-CAS-HH-VEH-MAKE') || null,
      vehicle_body_style: col(tokens, colMap, 'PVS-CAS-HH-VEH-STYLE') || null,
      vehicle_color: col(tokens, colMap, 'PVS-CAS-HH-VEH-COLOR-1') || null,
      vehicle_year,
      legacy_source: source,
      legacy_disposition_code: dispositionRaw || null,
      legacy_operator_id: col(tokens, colMap, 'PVS-CAS-OPERATOR-ID') || null,
      legacy_municipality_code: col(tokens, colMap, 'PVS-CAS-MUNICIPALITY') || null,
      legacy_raw,
    },
    ledger: ledger.filter((l) => nonEmpty(l.description)),
    docket,
  }
}
