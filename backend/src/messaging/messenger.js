import { PROVIDERS } from './providers.js'
import { normalizePhone } from './phone.js'

export const CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL']

const providerFor = (channel) => {
  const name = (process.env[`${channel}_PROVIDER`] || 'console').toLowerCase()
  return PROVIDERS[name] || PROVIDERS.console
}

// Sends one message on one channel. Never throws: the caller gets a status to store in the log.
export const sendOnChannel = async ({ channel, to, subject, body }) => {
  const address = channel === 'EMAIL' ? String(to || '').trim() : normalizePhone(to)

  if (!address || (channel === 'EMAIL' && !address.includes('@'))) {
    return { status: 'SKIPPED', error: channel === 'EMAIL' ? 'No valid e-mail address.' : 'No valid phone number.' }
  }

  try {
    const { providerId } = await providerFor(channel).send({ channel, to: address, subject, body })
    return { status: 'SENT', providerId, to: address }
  } catch (error) {
    return {
      status: error.code === 'NOT_CONFIGURED' ? 'SKIPPED' : 'FAILED',
      error: error.message,
      to: address,
    }
  }
}

// One-time passwords. The identifier is an e-mail address or a phone number.
export const sendOtpMessage = async (identifier, otp, expiresInMinutes) => {
  const body = `Your The Hostel Yard verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share it with anyone.`
  const isEmail = String(identifier).includes('@')
  const result = await sendOnChannel(
    isEmail
      ? { channel: 'EMAIL', to: identifier, subject: 'Your verification code', body }
      : { channel: 'SMS', to: identifier, body }
  )

  // Development fallback, or a deliberately unconfigured deployment: show the code in the server log.
  if (result.status !== 'SENT' && process.env.OTP_REQUIRE_PROVIDER !== 'true') {
    console.log(`[otp] ${identifier}: ${otp} (expires in ${expiresInMinutes} min) - delivery: ${result.status}${result.error ? ` (${result.error})` : ''}`)
    return { ...result, status: 'CONSOLE' }
  }

  if (result.status !== 'SENT') {
    const error = new Error('Could not send the verification code. Please try again later.')
    error.statusCode = 503
    throw error
  }

  return result
}

// Password reset links. Sent by e-mail only. Without a working e-mail provider the link is written to the
// server log outside production, so local testing still works; it is never sent back to the browser.
export const sendPasswordResetMessage = async ({ email, name, resetUrl, expiresInMinutes }) => {
  const firstName = String(name || '').trim().split(/\s+/)[0] || 'there'
  const body = [
    `Hi ${firstName},`,
    '',
    'We received a request to reset your The Hostel Yard password. Open this link to choose a new one:',
    resetUrl,
    '',
    `The link works once and expires in ${expiresInMinutes} minutes. If you did not ask for this, ignore this e-mail: your password stays the same.`,
  ].join('\n')

  const result = await sendOnChannel({ channel: 'EMAIL', to: email, subject: 'Reset your password', body })

  if (result.status !== 'SENT') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[password-reset] ${email}: ${resetUrl} - delivery: ${result.status}${result.error ? ` (${result.error})` : ''}`)
    } else {
      console.error(`[password-reset] could not e-mail the reset link: ${result.status}${result.error ? ` (${result.error})` : ''}`)
    }
  }

  return result
}
