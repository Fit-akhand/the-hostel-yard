// Turns whatever is stored in a phone field into an E.164 number, or null if it is not a real number.
// Placeholder numbers such as 0000000001 (used for imported tenants without a phone) return null.
export const normalizePhone = (raw, defaultCountryCode = '91') => {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+${defaultCountryCode}${digits}`
  }

  if (digits.length === 12 && digits.startsWith(defaultCountryCode) && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`
  }

  if (String(raw).trim().startsWith('+') && digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`
  }

  return null
}
