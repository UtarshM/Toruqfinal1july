/**
 * Document Utilities for Employee KYC, Onboarding & User Attachments
 */

export function getFriendlyDocName(keyOrName?: string): string {
  if (!keyOrName) return 'Document Attachment'
  const upper = keyOrName.trim().toUpperCase()
  
  if (upper === 'ADHAR' || upper === 'AADHAR' || upper === 'AADHAAR' || upper.includes('ADHAR') || upper.includes('AADHAAR')) {
    return 'Aadhaar Card'
  }
  if (upper === 'PAN' || upper === 'PAN_CARD' || upper.includes('PAN')) {
    return 'PAN Card'
  }
  if (upper === 'SSC' || upper.includes('10TH') || upper.includes('SSC')) {
    return '10th / SSC Marksheet'
  }
  if (upper === 'HSC' || upper.includes('12TH') || upper.includes('HSC')) {
    return '12th / HSC Marksheet'
  }
  if (upper === 'QUALIFICATION' || upper.includes('QUAL') || upper.includes('DEGREE') || upper.includes('GRADUATION')) {
    return 'Highest Qualification Degree'
  }
  if (upper === 'LEAVING' || upper.includes('LEAVING') || upper.includes('LC') || upper.includes('TRANSFER')) {
    return 'School / College Leaving Certificate'
  }
  if (upper === 'PHOTO' || upper.includes('PHOTO') || upper.includes('PASSPORT')) {
    return 'Passport Size Photograph'
  }
  if (upper === 'RESUME' || upper.includes('RESUME') || upper.includes('CV')) {
    return 'Resume / Curriculum Vitae'
  }
  if (upper.includes('PASSBOOK') || upper.includes('BANK') || upper.includes('CHEQUE')) {
    return 'Bank Passbook / Cancelled Cheque'
  }
  if (upper.includes('DRIVING') || upper.includes('LICENSE') || upper === 'DL') {
    return 'Driving License'
  }
  if (upper.includes('OFFER') || upper.includes('APPOINTMENT')) {
    return 'Offer / Appointment Letter'
  }
  if (upper.includes('EXPERIENCE') || upper.includes('EXP_CERT')) {
    return 'Experience Certificate'
  }
  
  // Format any raw string like "photo_front.jpg" -> "Photo Front"
  const clean = keyOrName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

export function extractGoogleDriveId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null
  let match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
  if (match && match[1]) return match[1]
  
  match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)
  if (match && match[1]) return match[1]

  match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (match && match[1]) return match[1]

  return null
}

export function getGoogleDriveEmbedUrl(url?: string): string | null {
  const driveId = extractGoogleDriveId(url)
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`
  }
  return null
}

export function getGoogleDriveDownloadUrl(url?: string): string | null {
  const driveId = extractGoogleDriveId(url)
  if (driveId) {
    return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`
  }
  return null
}

export function resolveDocUrl(doc: any): string {
  if (!doc) return ''
  const raw = doc.fileUrl || doc.url || doc.filePath || doc.path || ''
  return raw
}

export function getDocTypeInfo(fileName?: string, url?: string): {
  type: 'pdf' | 'image' | 'drive' | 'file'
  color: string
  bg: string
  border: string
  label: string
} {
  const nameLower = (fileName || '').toLowerCase()
  const urlLower = (url || '').toLowerCase()
  
  if (nameLower.includes('photo') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp')) {
    return {
      type: 'image',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: 'Photo / Image'
    }
  }
  if (nameLower.endsWith('.pdf') || urlLower.includes('.pdf') || nameLower === 'adhar' || nameLower === 'pan' || nameLower === 'ssc' || nameLower === 'qualification' || nameLower === 'leaving') {
    return {
      type: 'pdf',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      label: 'Document'
    }
  }
  if (urlLower.includes('drive.google.com')) {
    return {
      type: 'drive',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'Google Drive'
    }
  }
  return {
    type: 'file',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    label: 'File'
  }
}
