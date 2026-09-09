const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

const DATETIME_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const INR_DEC = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatINR(value, { decimals = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '₹0'
  return decimals ? INR_DEC.format(n) : INR.format(n)
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return DATE_FMT.format(d)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return DATETIME_FMT.format(d)
}

export function toInputDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const tz = d.getTime() - d.getTimezoneOffset() * 60000
  return new Date(tz).toISOString().slice(0, 10)
}

export function toISODate(value) {
  if (!value) return undefined
  return new Date(value).toISOString()
}

export function occupancyLabel(pct) {
  if (pct == null) return '—'
  return `${Number(pct).toFixed(1)}%`
}

export function initials(name = '') {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function idOf(entity) {
  if (!entity) return ''
  if (typeof entity === 'string') return entity
  return entity._id || entity.id || ''
}

export function nameOf(entity, fallback = '—') {
  if (!entity) return fallback
  if (typeof entity === 'string') return fallback
  return entity.name || entity.roomNumber || entity.bedNumber || fallback
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function passwordStrength(password) {
  let score = 0
  if (!password) return { score: 0, label: 'Too short' }
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  return { score, label: labels[score] }
}
