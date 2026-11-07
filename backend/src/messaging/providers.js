import nodemailer from 'nodemailer'

// Every provider returns { providerId } on success and throws on failure.

const isProduction = () => process.env.NODE_ENV === 'production'

// --- console: for local development. Never prints message bodies in production. -----------------
export const consoleProvider = {
  async send({ channel, to, subject, body }) {
    if (isProduction()) {
      const error = new Error('No provider configured for this channel.')
      error.code = 'NOT_CONFIGURED'
      throw error
    }
    console.log(`[messaging:console] ${channel} -> ${to}${subject ? ` | ${subject}` : ''}\n${body}\n`)
    return { providerId: 'console' }
  },
}

// --- Twilio (SMS and WhatsApp) through its REST API, no SDK needed ------------------------------
export const twilioProvider = {
  async send({ channel, to, body }) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = channel === 'WHATSAPP' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM

    if (!sid || !token || !from) {
      const error = new Error('Twilio credentials are incomplete.')
      error.code = 'NOT_CONFIGURED'
      throw error
    }

    const prefix = channel === 'WHATSAPP' ? 'whatsapp:' : ''
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `${prefix}${to}`,
        From: from.startsWith('whatsapp:') || channel !== 'WHATSAPP' ? from : `whatsapp:${from}`,
        Body: body,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || `Twilio request failed (${response.status}).`)
    return { providerId: data.sid }
  },
}

// --- SMTP e-mail -------------------------------------------------------------------------------
let transport
export const smtpProvider = {
  async send({ to, subject, body }) {
    if (!process.env.SMTP_HOST) {
      const error = new Error('SMTP is not configured.')
      error.code = 'NOT_CONFIGURED'
      throw error
    }

    transport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })

    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: subject || 'The Hostel Yard',
      text: body,
    })
    return { providerId: info.messageId }
  },
}

export const PROVIDERS = { console: consoleProvider, twilio: twilioProvider, smtp: smtpProvider }
