import Organization from '../models/Organization.js'
import User from '../models/User.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import RentPlan from '../models/RentPlan.js'
import RentDue from '../models/RentDue.js'
import Payment from '../models/Payment.js'
import Complaint from '../models/Complaint.js'
import JobRun from '../models/JobRun.js'
import Notification from '../models/Notification.js'
import FinanceSettings from '../models/FinanceSettings.js'
import { computeLateFee } from '../services/lateFeeCalculator.js'
import { createDuesForPlans } from '../services/rentService.js'
import { createNotifications } from '../services/notificationService.js'
import { deliver, getSettings } from '../messaging/deliveryService.js'

const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const monthKey = (d) => dayKey(d).slice(0, 7)

// Housekeeping: dues that passed their date without any payment become OVERDUE.
const markOverdue = async (organization, today) => {
  const result = await RentDue.updateMany(
    { organization, status: 'PENDING', dueDate: { $lt: today } },
    { $set: { status: 'OVERDUE' } }
  )
  return result.modifiedCount
}

// Adds the late fee to overdue rent according to the organisation's rent rules. The fee is part of `amount`,
// so payments, balances and reminders all see it. Running again the same day changes nothing.
export const applyLateFees = async (organization, today) => {
  const rule = (await FinanceSettings.findOne({ organization }).lean())?.lateFee
  if (!rule?.enabled) return 0

  const dues = await RentDue.find({ organization, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, dueDate: { $lt: today } })
  let changed = 0
  for (const due of dues) {
    const daysLate = Math.round((today - startOfDay(new Date(due.dueDate))) / DAY_MS)
    const fee = computeLateFee({ ...rule, baseAmount: due.amount - (due.lateFee || 0), daysLate })
    if (fee === (due.lateFee || 0)) continue
    due.amount += fee - (due.lateFee || 0)
    due.lateFee = fee
    await due.save()
    changed++
  }
  return changed
}

// Makes sure this month's rent dues exist (only when the owner switched it on).
const ensureCurrentMonthDues = async (organization, today) => {
  const plans = await RentPlan.find({ organization, status: 'ACTIVE', startDate: { $lte: today } })
  return createDuesForPlans(plans, monthKey(today))
}

// Should a reminder go out for a due that is `diff` days away (negative = days overdue)?
export const reminderKind = (diff, rent) => {
  if (diff > 0 && (rent.daysBefore || []).includes(diff)) return 'RENT_REMINDER'
  if (diff === 0 && rent.onDueDay !== false) return 'RENT_REMINDER'
  const late = -diff
  if (late > 0 && (late === 1 || late % (rent.overdueEveryDays || 3) === 0)) return 'RENT_OVERDUE'
  return null
}

const sendRentReminders = async (organization, settings, today) => {
  if (settings.rent?.enabled === false) return 0

  const dues = await RentDue.find({ organization, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } })
    .populate('property', 'name')
    .lean()
  const tenants = new Map(
    (await Tenant.find({ _id: { $in: dues.map((d) => d.tenant) }, status: { $ne: 'LEFT' } }).lean()).map((t) => [String(t._id), t])
  )

  let sent = 0
  for (const due of dues) {
    const tenant = tenants.get(String(due.tenant))
    const balance = due.amount - (due.paidAmount || 0)
    if (!tenant || balance <= 0) continue

    const diff = Math.round((startOfDay(new Date(due.dueDate)) - today) / DAY_MS)
    const type = reminderKind(diff, settings.rent)
    if (!type) continue

    const vars = {
      name: tenant.name.split(' ')[0], property: due.property?.name || 'your PG', billingMonth: due.billingMonth,
      balance, dueDate: due.dueDate, daysLeft: diff, daysOverdue: -diff,
    }
    const results = await deliver({
      organization, property: due.property?._id, tenant: tenant._id, user: tenant.user || null, type, vars,
      to: { phone: tenant.phone, email: tenant.email }, dedupeKey: `rent:${due._id}:${dayKey(today)}`,
    })
    sent += results.filter((r) => r.status === 'SENT').length

    if (settings.channels?.inApp !== false && tenant.user) {
      const already = await Notification.exists({ recipient: tenant.user, type, 'data.dueId': due._id, createdAt: { $gte: today } })
      if (!already) {
        await createNotifications({
          recipients: [tenant.user], organization, property: due.property?._id, type,
          title: type === 'RENT_OVERDUE' ? 'Rent overdue' : 'Rent reminder',
          message: type === 'RENT_OVERDUE'
            ? `Your rent of ₹${balance} for ${due.billingMonth} is ${-diff} day(s) overdue.`
            : diff > 0 ? `Your rent of ₹${balance} for ${due.billingMonth} is due in ${diff} day(s).` : `Your rent of ₹${balance} for ${due.billingMonth} is due today.`,
          data: { dueId: due._id },
        })
      }
    }
  }
  return sent
}

const sendOwnerDigest = async (organization, owner, settings, today) => {
  if (settings.digest === false || !owner) return false

  const overdue = await RentDue.find({ organization, status: 'OVERDUE' }).lean()
  const open = await RentDue.find({ organization, billingMonth: monthKey(today), status: { $in: ['PENDING', 'PARTIAL'] } }).lean()
  const sum = (rows) => rows.reduce((t, d) => t + (d.amount - (d.paidAmount || 0)), 0)
  const vars = {
    date: today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    overdueCount: new Set(overdue.map((d) => String(d.tenant))).size, overdueAmount: sum(overdue), pendingAmount: sum(open),
    pendingPayments: await Payment.countDocuments({ organization, status: 'PENDING' }),
    openComplaints: await Complaint.countDocuments({ organization, status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } }),
  }

  await deliver({
    organization, user: owner._id, type: 'DAILY_DIGEST', vars,
    to: { phone: owner.phone, email: owner.email }, dedupeKey: `digest:${organization}:${dayKey(today)}`,
  })
  if (settings.channels?.inApp !== false) {
    if (!(await Notification.exists({ recipient: owner._id, type: 'DAILY_DIGEST', createdAt: { $gte: today } }))) {
      await createNotifications({
        recipients: [owner._id], organization, type: 'DAILY_DIGEST', title: 'Daily summary',
        message: `Overdue ₹${vars.overdueAmount} (${vars.overdueCount} tenants), ${vars.pendingPayments} payments to verify, ${vars.openComplaints} open complaints.`,
      })
    }
  }
  return true
}

// Runs every daily task. Safe to run more than once a day: reminders and summaries are de-duplicated.
export const runDailyJobs = async ({ organizationId = null, now = new Date() } = {}) => {
  const today = startOfDay(now)
  const filter = organizationId ? { _id: organizationId } : {}
  const organizations = await Organization.find({ ...filter, status: 'ACTIVE' }).lean()
  const summary = []

  for (const org of organizations) {
    const owner = await User.findById(org.owner)
    // The public demo organisation holds made-up people: never message them.
    if (owner?.isDemo) continue

    const startedAt = new Date()
    const entry = { organization: String(org._id), name: org.name }
    try {
      const settings = await getSettings(org._id)
      if (settings.autoMarkOverdue !== false) entry.markedOverdue = await markOverdue(org._id, today)
      if (settings.autoGenerateDues) entry.duesCreated = (await ensureCurrentMonthDues(org._id, today)).created
      entry.lateFeesApplied = await applyLateFees(org._id, today)
      entry.remindersSent = await sendRentReminders(org._id, settings, today)
      entry.digestSent = await sendOwnerDigest(org._id, owner, settings, today)
    } catch (error) {
      entry.error = error.message
      console.error(`[jobs] daily run failed for ${org.name}:`, error.message)
    }
    await JobRun.create({ name: 'daily', organization: org._id, startedAt, finishedAt: new Date(), summary: entry })
    summary.push(entry)
  }
  return summary
}

// Optional in-process scheduler for local development or a single always-on server.
// Vercel serverless has no long-running process: use the cron endpoint there.
export const startLocalScheduler = () => {
  const hour = Number(process.env.SCHEDULER_HOUR || 9)
  let lastRunDay = null
  const tick = async () => {
    const now = new Date()
    if (now.getHours() < hour || lastRunDay === dayKey(now)) return
    lastRunDay = dayKey(now)
    try {
      const summary = await runDailyJobs({ now })
      console.log('[jobs] daily run finished', JSON.stringify(summary))
    } catch (error) {
      console.error('[jobs] daily run failed:', error.message)
    }
  }
  setInterval(tick, 10 * 60 * 1000).unref()
  tick()
  console.log(`[jobs] local scheduler on, daily run at ${hour}:00`)
}
