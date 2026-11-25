import crypto from 'crypto'

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`)
const threeDigits = (n) => {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
}

// 125000 -> "One Lakh Twenty Five Thousand" (Indian numbering).
export const numberToIndianWords = (value) => {
  let n = Math.floor(Math.abs(Number(value) || 0))
  if (n === 0) return 'Zero'
  const parts = []
  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (n) parts.push(threeDigits(n))
  return parts.join(' ')
}

export const formatRupees = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}/- (Rupees ${numberToIndianWords(value)} only)`

export const formatDocDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '________'

// Fills {{name}} placeholders. Unknown values (undefined or null) become a blank line to fill in by hand,
// never "undefined"; an empty string means "leave this out" (for example no late fee).
export const renderTemplate = (body, values) =>
  String(body || '')
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const value = values[key]
      return value === undefined || value === null ? '________' : String(value)
    })
    .replace(/[ \t]+\n/g, '\n')

export const placeholdersIn = (body) => [...new Set([...String(body || '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]))]

// Fingerprint of the frozen text and data, so anyone can check later that nothing changed.
export const documentHash = (body, data = {}) =>
  crypto.createHash('sha256').update(String(body)).update('\n').update(JSON.stringify(data)).digest('hex')
