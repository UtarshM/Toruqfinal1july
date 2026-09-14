/**
 * Universal Indian Standard Time (IST / Asia/Kolkata) Date Utilities
 * Ensures all dates across UI, exports, and messages are formatted strictly as DD/MM/YYYY.
 */

export function formatDateDMY(dateVal: any, fallback: string = ''): string {
  if (!dateVal) return fallback
  const str = String(dateVal).trim()
  if (!str || str === 'N/A' || str === 'NA' || str === 'null' || str === 'undefined' || str === '—') {
    return fallback
  }

  // If already DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0')
    const mm = dmyMatch[2].padStart(2, '0')
    const yyyy = dmyMatch[3]
    return `${dd}/${mm}/${yyyy}`
  }

  // Pure YYYY-MM-DD
  const pureYmdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (pureYmdMatch) {
    const yyyy = pureYmdMatch[1]
    const mm = pureYmdMatch[2].padStart(2, '0')
    const dd = pureYmdMatch[3].padStart(2, '0')
    return `${dd}/${mm}/${yyyy}`
  }

  // DDMMYYYY without delimiters (e.g. 11042011)
  const ddmmyyyyMatch = str.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (ddmmyyyyMatch) {
    const dd = ddmmyyyyMatch[1]
    const mm = ddmmyyyyMatch[2]
    const yyyy = ddmmyyyyMatch[3]
    const dNum = parseInt(dd, 10)
    const mNum = parseInt(mm, 10)
    const yNum = parseInt(yyyy, 10)
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31 && yNum >= 1900 && yNum <= 2100) {
      return `${dd}/${mm}/${yyyy}`
    }
  }

  // Excel serial number (e.g. 46322 or 40644.00011574074)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    if (num > 10000 && num < 80000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000))
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const yyyy = d.getUTCFullYear()
      return `${dd}/${mm}/${yyyy}`
    }
  }

  // Parse as Date with IST (Asia/Kolkata) timezone
  const d = new Date(dateVal)
  if (!isNaN(d.getTime())) {
    let ms = d.getTime()
    const utcHours = d.getUTCHours()
    const utcMinutes = d.getUTCMinutes()
    // SheetJS IST artifact: 18:28-18:30 UTC represents midnight (00:00) IST
    if (utcHours === 18 && utcMinutes >= 28 && utcMinutes <= 30) {
      ms += (30 - utcMinutes) * 60 * 1000 + 1000
    }
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(ms))
  }

  return fallback || str
}

/**
 * Format date for HTML <input type="date"> value (YYYY-MM-DD in IST)
 */
export function toISTDateInput(dateVal: any): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''
  let ms = d.getTime()
  const utcHours = d.getUTCHours()
  const utcMinutes = d.getUTCMinutes()
  if (utcHours === 18 && utcMinutes >= 28 && utcMinutes <= 30) {
    ms += (30 - utcMinutes) * 60 * 1000 + 1000
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(ms))
}

/**
 * Format datetime as DD/MM/YYYY, hh:mm A in IST
 */
export function formatDateTimeDMY(dateVal: any, fallback: string = ''): string {
  if (!dateVal) return fallback
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return fallback
  let ms = d.getTime()
  const utcHours = d.getUTCHours()
  const utcMinutes = d.getUTCMinutes()
  if (utcHours === 18 && utcMinutes >= 28 && utcMinutes <= 30) {
    ms += (30 - utcMinutes) * 60 * 1000 + 1000
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(ms))
}

/**
 * Get current date string (YYYY-MM-DD) in Asia/Kolkata IST
 */
export function getISTDateString(offsetDays: number = 0): string {
  const d = new Date()
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays)
  }
  return toISTDateInput(d)
}

