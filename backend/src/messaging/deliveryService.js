import MessageLog from '../models/MessageLog.js'
import NotificationSettings, { DEFAULT_SETTINGS } from '../models/NotificationSettings.js'
import { CHANNELS, sendOnChannel } from './messenger.js'
import { TEMPLATES, TYPE_GROUP } from './templates.js'

export const getSettings = async (organization) =>
  (await NotificationSettings.findOne({ organization }).lean()) || { ...DEFAULT_SETTINGS, organization }

const channelEnabled = (settings, channel) => Boolean(settings.channels?.[channel.toLowerCase()])

const typeEnabled = (settings, type) => {
  const group = TYPE_GROUP[type]
  if (group === 'always') return true
  if (group === 'rent') return settings.rent?.enabled !== false
  if (group === 'digest') return settings.digest !== false
  return settings.events?.[group] !== false
}

// Sends one message (WhatsApp / SMS / e-mail, whichever the organisation switched on) to one person.
// `to` is { phone, email }. `dedupeKey` makes a repeat call for the same event a no-op.
// Failures are logged, never thrown, so a messaging problem cannot break the action that triggered it.
export const deliver = async ({ organization, property = null, tenant = null, user = null, type, vars = {}, to, dedupeKey = null, force = [] }) => {
  const results = []
  try {
    const settings = await getSettings(organization)
    if (!typeEnabled(settings, type)) return results

    const channels = CHANNELS.filter((c) => force.includes(c) || channelEnabled(settings, c))
    for (const channel of channels) {
      const key = dedupeKey ? `${dedupeKey}:${channel}` : null
      if (key && (await MessageLog.exists({ dedupeKey: key }))) continue

      const { title, body } = TEMPLATES[type]({ ...vars, channel })
      const address = channel === 'EMAIL' ? to?.email : to?.phone
      const result = await sendOnChannel({ channel, to: address, subject: title, body })

      try {
        await MessageLog.create({
          organization, property, tenant, user, type, channel,
          to: result.to || address || null, body,
          status: result.status, providerId: result.providerId || null, error: result.error || null,
          dedupeKey: key,
        })
      } catch (logError) {
        if (logError.code !== 11000) throw logError // 11000 = a parallel run already logged this message
      }
      results.push({ channel, ...result })
    }
  } catch (error) {
    console.error(`[messaging] delivery of ${type} failed:`, error.message)
  }
  return results
}

export const deliverMany = (recipients, base) =>
  Promise.all(recipients.map((r) => deliver({ ...base, ...r, vars: { ...base.vars, ...r.vars } })))
