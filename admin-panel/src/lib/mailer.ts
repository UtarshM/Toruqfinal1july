import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'mail.torqueautoadvisor.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'info@torqueautoadvisor.com'
const SMTP_PASS = process.env.SMTP_PASS || 'T@rk#123$45'
const OTP_TARGET_EMAIL = 'torqueotp@yahoo.com'

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

/**
 * Format date time in Indian Standard Time (IST) as DD-MM-YYYY hh:mm A
 * Example: 22-09-2025 03:42 PM
 */
function getFormattedIstDateTime(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date())

  let day = '', month = '', year = '', hour = '', minute = '', dayPeriod = ''
  for (const part of parts) {
    if (part.type === 'day') day = part.value
    if (part.type === 'month') month = part.value
    if (part.type === 'year') year = part.value
    if (part.type === 'hour') hour = part.value
    if (part.type === 'minute') minute = part.value
    if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase()
  }

  return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`
}

const STAFF_OTP_TARGET = 'torqueotp@yahoo.com'
const ADMIN_OTP_TARGET = 'myattar@yahoo.com'

/**
 * Send OTP email matching vehicle-bk format:
 * - Admin OTP -> myattar@yahoo.com
 * - Staff OTP -> torqueotp@yahoo.com
 * - CC -> um18218@gmail.com
 */
export async function sendOtpEmail(fullName: string, otp: string, targetEmail: string = STAFF_OTP_TARGET): Promise<boolean> {
  try {
    const currentTime = getFormattedIstDateTime()
    const upperName = (fullName || 'User').toUpperCase().trim()
    const cleanName = (fullName || 'User').trim()

    const subject = `Dear ${upperName}, Your OTP Code: ${otp} at ${currentTime}`
    const htmlBody = `
      <p>Dear ${cleanName},</p>
      <p>Your OTP for login verification is: <b>${otp}</b></p>
      <p>Regards,<br>Torque Auto Advisor</p>
    `

    const info = await transporter.sendMail({
      from: `"Torque Auto Advisor" <${SMTP_USER}>`,
      to: targetEmail,
      cc: 'um18218@gmail.com',
      subject,
      html: htmlBody,
    })

    console.log(`[mailer] OTP email dispatched to ${targetEmail} (CC: um18218@gmail.com, messageId: ${info.messageId})`)
    return true
  } catch (error) {
    console.error(`[mailer] Failed to send OTP email to ${targetEmail}:`, error)
    return false
  }
}

/**
 * Backwards compatible staff helper
 */
export async function sendStaffOtpEmail(fullName: string, otp: string): Promise<boolean> {
  return sendOtpEmail(fullName, otp, STAFF_OTP_TARGET)
}

