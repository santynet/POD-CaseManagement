import { describe, it, expect } from 'vitest'
import { resolvePlate } from '../resolvePlate'
import { mapDisposition } from '../mapDisposition'
import { parseHeader, parsePvsRow, PVS_COLUMNS } from '../parsePvsRow'

// A single PVS row assembled from PVS_COLUMNS. Pass overrides to replace
// specific columns; all others default to empty string (or the minimum
// required for a valid row).
function makeRow(overrides: Record<string, string> = {}): string {
  const required: Record<string, string> = {
    'PVS-TAG-LICENSE': 'RITP63',
    'PVS-TAG-STATE': 'FL',
    'PVS-CAS-CITATION-NO': '00000001',
    'PVS-CAS-ISSUE-DATE': '20250101',
    'PVS-CAS-ENTRY-DATE': '20250102',
    'PVS-CAS-FINE-ASSD': ' 046.00',
    'PVS-CAS-COST-ASSD': ' 000.00',
    'PVS-CAS-SCHRG-ASSD': ' 000.00',
    'PVS-CAS-AMT-PAID': ' 000.00',
    'PVS-CAS-CFEE-ASSD': ' 000.00',
    'PVS-CAS-CFEE-PAID': ' 000.00',
    'PVS-CAS-VIOLATION': '011',
    'PVS-CAS-DISPOSITION': '',
    'PVS-CAS-HH-VIO-LOCATION': '1412 Coral Way',
    'PVS-CAS-HH-VIO-STATUTE': '30-49.20A',
    'PVS-CAS-HH-VEH-MAKE': 'FORD',
    'PVS-CAS-HH-VEH-STYLE': '4D',
    'PVS-CAS-HH-VEH-COLOR-1': 'WHI',
    'PVS-CAS-HH-DECAL-EXP': '2024',
    'PVS-CAS-HH-DECAL-NBR': '',
    'PVS-CAS-ORIGIN-TAG-LICENSE': '',
    'PVS-CAS-ORIGIN-TAG-STATE': '',
  }
  return PVS_COLUMNS.map((c) => overrides[c] ?? required[c] ?? '').join('\t')
}

const HEADER = PVS_COLUMNS.join('\t')

describe('resolvePlate', () => {
  it('uses origin-tag when present', () => {
    const p = resolvePlate({
      pvsTagLicense: 'EVMX893301',
      pvsTagState: 'FL',
      hhDecalNbr: 'EVMX89',
      originTagLicense: '14EQNR',
      originTagState: 'FL',
    })
    expect(p.plate_number).toBe('14EQNR')
    expect(p.state).toBe('FL')
  })

  it('strips trailing sequence digits when decal is a prefix', () => {
    const p = resolvePlate({
      pvsTagLicense: 'EVMX893301',
      pvsTagState: 'FL',
      hhDecalNbr: 'EVMX89',
      originTagLicense: '',
      originTagState: '',
    })
    expect(p.plate_number).toBe('EVMX89')
  })

  it('falls back to PVS-TAG-LICENSE when neither rule applies', () => {
    const p = resolvePlate({
      pvsTagLicense: 'RITP63',
      pvsTagState: 'FL',
      hhDecalNbr: '',
      originTagLicense: '',
      originTagState: '',
    })
    expect(p.plate_number).toBe('RITP63')
  })

  it('does not strip if trailing part is not all digits', () => {
    const p = resolvePlate({
      pvsTagLicense: 'ABCDEFG',
      pvsTagState: 'FL',
      hhDecalNbr: 'ABC',
      originTagLicense: '',
      originTagState: '',
    })
    expect(p.plate_number).toBe('ABCDEFG')
  })
})

describe('mapDisposition', () => {
  const base = { closedDate: null, totalAssessed: 100, totalPaid: 0 }
  it('maps paid codes to Closed/Paid', () => {
    for (const code of ['001', '002', '005']) {
      expect(mapDisposition({ ...base, rawCode: code }))
        .toEqual({ primary_status: 'Closed', secondary_disposition: 'Paid' })
    }
  })
  it('maps dismissal codes to Dismissed/None', () => {
    for (const code of ['003', '004']) {
      expect(mapDisposition({ ...base, rawCode: code }))
        .toEqual({ primary_status: 'Dismissed', secondary_disposition: 'None' })
    }
  })
  it('007 is Open + Payment Plan', () => {
    expect(mapDisposition({ ...base, rawCode: '007' }))
      .toEqual({ primary_status: 'Open', secondary_disposition: 'Payment Plan' })
  })
  it('blank code with no closed date is Open', () => {
    expect(mapDisposition({ ...base, rawCode: '' }))
      .toEqual({ primary_status: 'Open', secondary_disposition: 'None' })
  })
  it('blank code with closed date + full payment is Closed/Paid', () => {
    expect(
      mapDisposition({ rawCode: '', closedDate: new Date('2025-01-01'), totalAssessed: 100, totalPaid: 100 }),
    ).toEqual({ primary_status: 'Closed', secondary_disposition: 'Paid' })
  })
})

describe('parsePvsRow', () => {
  const colMap = parseHeader(HEADER)
  const opts = { lineNumber: 2, source: 'PVS3805', importDate: new Date('2026-04-14') }

  it('parses a minimal open case', () => {
    const row = parsePvsRow(makeRow().split('\t'), colMap, opts)
    expect(row.citation.citation_number).toBe('00000001')
    expect(row.citation.primary_status).toBe('Open')
    expect(row.citation.secondary_disposition).toBe('None')
    expect(row.citation.balance).toBe(46)
    expect(row.citation.fine_amount).toBe(46)
    expect(row.citation.ordinance_or_statute).toBe('30-49.20A')
    expect(row.citation.violation_code).toBe('11')
    expect(row.citation.vehicle_make).toBe('FORD')
    expect(row.plate.plate_number).toBe('RITP63')
    expect(row.ledger).toHaveLength(1)
    expect(row.ledger[0].entry_type).toBe('Fine')
    expect(row.docket).toHaveLength(2)
    expect(row.docket[1].description).toContain('Imported from PVS3805')
  })

  it('parses a paid+closed case with payment ledger entry', () => {
    const line = makeRow({
      'PVS-CAS-CITATION-NO': '00000002',
      'PVS-CAS-AMT-PAID': ' 046.00',
      'PVS-CAS-FINE-PAID': ' 046.00',
      'PVS-CAS-CLOSED-DATE': '20250315',
      'PVS-CAS-DISP-DATE': '20250315',
      'PVS-CAS-DISPOSITION': '001',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    expect(row.citation.primary_status).toBe('Closed')
    expect(row.citation.secondary_disposition).toBe('Paid')
    expect(row.citation.balance).toBe(0)
    expect(row.citation.closed_date).toEqual(new Date(Date.UTC(2025, 2, 15)))
    const pay = row.ledger.find((l) => l.entry_type === 'Payment')
    expect(pay).toBeTruthy()
    expect(pay!.credit).toBe(46)
  })

  it('parses a dismissed case', () => {
    const line = makeRow({
      'PVS-CAS-CITATION-NO': '00000003',
      'PVS-CAS-DISPOSITION': '003',
      'PVS-CAS-CLOSED-DATE': '20250320',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    expect(row.citation.primary_status).toBe('Dismissed')
    expect(row.citation.balance).toBe(0)
  })

  it('parses a partial payment as Payment Plan', () => {
    const line = makeRow({
      'PVS-CAS-CITATION-NO': '00000004',
      'PVS-CAS-FINE-ASSD': ' 110.00',
      'PVS-CAS-AMT-PAID': ' 055.00',
      'PVS-CAS-DISPOSITION': '007',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    expect(row.citation.secondary_disposition).toBe('Payment Plan')
    expect(row.citation.primary_status).toBe('Open')
    expect(row.citation.balance).toBe(55)
  })

  it('computes balance with all fee buckets', () => {
    const line = makeRow({
      'PVS-CAS-CITATION-NO': '00000005',
      'PVS-CAS-FINE-ASSD': ' 100.00',
      'PVS-CAS-COST-ASSD': ' 015.00',
      'PVS-CAS-SCHRG-ASSD': ' 005.00',
      'PVS-CAS-CFEE-ASSD': ' 025.00',
      'PVS-CAS-AMT-PAID': ' 050.00',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    // assessed 145, paid 50, balance 95
    expect(row.citation.balance).toBe(95)
    // Should have Fine, CourtFee, Adjustment, CollectionFee, Payment.
    expect(row.ledger.map((l) => l.entry_type).sort()).toEqual([
      'Adjustment',
      'CollectionFee',
      'CourtFee',
      'Fine',
      'Payment',
    ])
  })

  it('resolves plate via origin-tag when present', () => {
    const line = makeRow({
      'PVS-TAG-LICENSE': 'EVMX893301',
      'PVS-CAS-ORIGIN-TAG-LICENSE': '14EQNR',
      'PVS-CAS-ORIGIN-TAG-STATE': 'FL',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    expect(row.plate.plate_number).toBe('14EQNR')
  })

  it('strips trailing digits with HH-DECAL-NBR', () => {
    const line = makeRow({
      'PVS-TAG-LICENSE': 'NFWE231085',
      'PVS-CAS-HH-DECAL-NBR': 'NFWE23',
    })
    const row = parsePvsRow(line.split('\t'), colMap, opts)
    expect(row.plate.plate_number).toBe('NFWE23')
  })
})
