/**
 * src/lib/vehicle-helper.ts
 * Canonical vehicle number normalization utility for Torque Auto Advisors.
 * 
 * Rules:
 * - Strips all hyphens, spaces, dots, and special characters.
 * - Converts all alphabetic characters to uppercase.
 * - Examples:
 *   "GJ-05-AB-1234" -> "GJ05AB1234"
 *   "gj 05 ab 1234" -> "GJ05AB1234"
 *   "GJ05AB1234"    -> "GJ05AB1234"
 */

export function normalizeVehicleNo(raw: any): string | null {
  if (raw === null || raw === undefined) return null
  const str = String(raw).trim()
  if (!str) return null

  const upper = str.toUpperCase()
  if (
    upper === 'NA' ||
    upper === 'N/A' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === '—' ||
    upper === '-'
  ) {
    return null
  }

  // Strip all non-alphanumeric characters
  const normalized = upper.replace(/[^A-Z0-9]/g, '')
  return normalized.length >= 4 ? normalized : null
}

/**
 * Validates if the string has a reasonable Indian registration number format:
 * 2 state letters + 2 digit RTO code + optional series (1-3 letters) + 4 digits
 * e.g. "GJ05AB1234", "MH12DE4567", "DL01A9999"
 */
export function isValidVehicleNo(raw: any): boolean {
  const norm = normalizeVehicleNo(raw)
  if (!norm) return false
  return /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(norm)
}

/**
 * Returns formatted friendly display representation e.g. "GJ-05-AB-1234"
 */
export function formatVehicleNo(raw: any): string {
  const norm = normalizeVehicleNo(raw)
  if (!norm) return String(raw || '—').trim() || '—'

  const match = norm.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/)
  if (match) {
    const [, state, rto, series, num] = match
    return `${state}-${rto}${series ? `-${series}` : ''}-${num}`
  }
  return norm
}
