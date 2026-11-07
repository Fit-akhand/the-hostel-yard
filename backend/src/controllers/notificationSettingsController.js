import NotificationSettings from '../models/NotificationSettings.js'
import MessageLog from '../models/MessageLog.js'
import JobRun from '../models/JobRun.js'
import User from '../models/User.js'
import { deliver, getSettings } from '../messaging/deliveryService.js'
import { CHANNELS } from '../messaging/messenger.js'
import { runDailyJobs } from '../jobs/dailyJobs.js'

const ok = (res, data, message) => res.status(200).json({ success: true, message, data })

export const getNotificationSettings = async (req, res, next) => {
  try {
    const settings = await getSettings(req.user.organization)
    const lastRun = await JobRun.findOne({ name: 'daily', organization: req.user.organization }).sort({ startedAt: -1 }).lean()
    ok(res, {
      settings,
      lastRun,
      // Tells the page which channels can really deliver, so it can warn instead of failing silently.
      providers: Object.fromEntries(CHANNELS.map((c) => [c, (process.env[`${c}_PROVIDER`] || 'console').toLowerCase()])),
    })
  } catch (error) {
    next(error)
  }
}

export const updateNotificationSettings = async (req, res, next) => {
  try {
    const settings = await NotificationSettings.findOneAndUpdate(
      { organization: req.user.organization },
      { $set: req.body, $setOnInsert: { organization: req.user.organization } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
    ok(res, { settings }, 'Notification settings saved.')
  } catch (error) {
    next(error)
  }
}

export const sendTestMessage = async (req, res, next) => {
  try {
    const owner = await User.findById(req.user._id)
    const channels = req.body.channels?.length ? req.body.channels : CHANNELS
    const results = []
    for (const channel of channels) {
      const [r] = await deliver({
        organization: req.user.organization, user: owner._id, type: 'TEST', vars: {},
        to: { phone: owner.phone, email: owner.email }, force: [channel],
      })
      if (r) results.push(r)
    }
    ok(res, { results }, 'Test message processed.')
  } catch (error) {
    next(error)
  }
}

export const runRemindersNow = async (req, res, next) => {
  try {
    const summary = await runDailyJobs({ organizationId: req.user.organization })
    ok(res, { summary }, 'Daily tasks completed.')
  } catch (error) {
    next(error)
  }
}

export const getMessageLogs = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const logs = await MessageLog.find({ organization: req.user.organization })
      .sort({ createdAt: -1 }).limit(limit)
      .populate('tenant', 'name').select('-dedupeKey').lean()
    ok(res, { logs })
  } catch (error) {
    next(error)
  }
}
