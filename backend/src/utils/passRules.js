import crypto from 'crypto'

export const MAX_DAYS_AHEAD = 14

// Today's calendar day in India as "YYYY-MM-DD".
export const todayInIndia = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

export const addDays = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

// Returns a message when the visit day is not allowed, otherwise null.
export const visitDateProblem = (day, today = todayInIndia()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) || addDays(day, 0) !== day) return 'Choose a valid visit date.'
  if (day < today) return 'The visit date cannot be in the past.'
  if (day > addDays(today, MAX_DAYS_AHEAD)) return `A visit can be planned up to ${MAX_DAYS_AHEAD} days ahead.`
  return null
}

// A pass that was never used stops working after its visit day.
export const effectiveStatus = (pass, today = todayInIndia()) =>
  ['PENDING', 'APPROVED'].includes(pass.status) && pass.visitDate < today ? 'EXPIRED' : pass.status

// Private links are "<id>.<signature>": nothing extra to store, and they cannot be guessed or edited.
// `purpose` keeps a visitor's pass link from working as a resident's approval link.
export const signLink = (purpose, id, secret = process.env.JWT_SECRET) => {
  const signature = crypto.createHmac('sha256', String(secret)).update(`guest-pass:${purpose}:${id}`).digest('base64url').slice(0, 32)
  return `${id}.${signature}`
}

export const readLink = (purpose, token, secret = process.env.JWT_SECRET) => {
  const match = /^([a-f\d]{24})\.([A-Za-z0-9_-]{32})$/i.exec(String(token || ''))
  if (!match) return null
  const expected = Buffer.from(signLink(purpose, match[1], secret))
  const given = Buffer.from(String(token))
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? match[1] : null
}

export const newCode = () => String(crypto.randomInt(100000, 1000000))
