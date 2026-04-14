import type { ParsedPlate } from './types'

/**
 * Plate resolution rule (per user spec):
 *
 * 1. If PVS-CAS-ORIGIN-TAG-LICENSE is non-empty, use it + ORIGIN-TAG-STATE.
 * 2. Else if HH-DECAL-NBR is a prefix of PVS-TAG-LICENSE and the remainder
 *    is trailing digits, use HH-DECAL-NBR + PVS-TAG-STATE (the trailing
 *    digits are a legacy sequence marker, not part of the plate).
 * 3. Else use PVS-TAG-LICENSE + PVS-TAG-STATE unchanged.
 */
export function resolvePlate(inputs: {
  pvsTagLicense: string
  pvsTagState: string
  hhDecalNbr: string
  originTagLicense: string
  originTagState: string
}): ParsedPlate {
  const { pvsTagLicense, pvsTagState, hhDecalNbr, originTagLicense, originTagState } = inputs

  if (originTagLicense.trim().length > 0) {
    return {
      plate_number: originTagLicense.trim(),
      state: (originTagState || pvsTagState).trim() || 'FL',
      lookup_status: 'Found',
    }
  }

  const tag = pvsTagLicense.trim()
  const decal = hhDecalNbr.trim()

  if (decal.length > 0 && tag.length > decal.length && tag.startsWith(decal)) {
    const trailing = tag.slice(decal.length)
    if (/^\d+$/.test(trailing)) {
      return {
        plate_number: decal,
        state: pvsTagState.trim() || 'FL',
        lookup_status: 'Found',
      }
    }
  }

  return {
    plate_number: tag,
    state: pvsTagState.trim() || 'FL',
    lookup_status: tag.length > 0 ? 'Found' : 'NotFound',
  }
}
