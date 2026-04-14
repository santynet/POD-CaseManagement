import type { CaseDisposition, CaseStatus } from './types'

/**
 * Map a PVS disposition code (e.g. "001", "003", "007") to our
 * (primary_status, secondary_disposition) pair.
 *
 * Dictionary (provided by user):
 *   001 PAID                         -> Closed, Paid
 *   002 PAID - DISMISSAL FEE         -> Closed, Paid
 *   003 DISMISSED (AGENCY/CLERK)     -> Dismissed, None
 *   004 DISMISSED (BY JUDGE)         -> Dismissed, None
 *   005 PAID (COURT AMOUNT)          -> Closed, Paid
 *   007 PARTIAL PAYMENT              -> Open, Payment Plan
 *   009 REFUND/TRANSFER              -> Open, None
 *   010 RETURNED CHECK               -> Open, None
 *   blank + CLOSED-DATE  = 0         -> Open, None
 *   blank + CLOSED-DATE != 0         -> Closed, (Paid if fully paid else None)
 */
export function mapDisposition(params: {
  rawCode: string
  closedDate: Date | null
  totalAssessed: number
  totalPaid: number
}): { primary_status: CaseStatus; secondary_disposition: CaseDisposition } {
  const code = params.rawCode.trim()

  switch (code) {
    case '001':
    case '002':
    case '005':
      return { primary_status: 'Closed', secondary_disposition: 'Paid' }
    case '003':
    case '004':
      return { primary_status: 'Dismissed', secondary_disposition: 'None' }
    case '007':
      return { primary_status: 'Open', secondary_disposition: 'Payment Plan' }
    case '009':
    case '010':
      return { primary_status: 'Open', secondary_disposition: 'None' }
  }

  // Blank or unknown code. Fall back to closed-date heuristic.
  if (params.closedDate) {
    const fullyPaid = params.totalPaid >= params.totalAssessed && params.totalAssessed > 0
    return {
      primary_status: 'Closed',
      secondary_disposition: fullyPaid ? 'Paid' : 'None',
    }
  }
  return { primary_status: 'Open', secondary_disposition: 'None' }
}
