import Organization from '../models/Organization.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import User from '../models/User.js'
import RentDue from '../models/RentDue.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { createNotifications } from './notificationService.js'
import { deliver } from '../messaging/deliveryService.js'
import { getSettings } from '../messaging/deliveryService.js'

// Messages that go out when something happens (as opposed to the daily job). Every function swallows its own
// errors: a failed WhatsApp must never make "raise complaint" or "verify payment" fail.
const safely = (label, fn) => fn().catch((error) => console.error(`[messaging] ${label} failed:`, error.message))

const inAppOn = async (organization) => (await getSettings(organization)).channels?.inApp !== false

export const notifyComplaintCreated = (complaint) =>
  safely('complaint-created', async () => {
    const [org, property, tenant, managers] = await Promise.all([
      Organization.findById(complaint.organization).lean(),
      Property.findById(complaint.property).select('name').lean(),
      Tenant.findById(complaint.tenant).select('name').lean(),
      PropertyManagerAssignment.find({ property: complaint.property, status: 'ACTIVE' }).select('manager').lean(),
    ])
    const recipientIds = [...new Set([String(org.owner), ...managers.map((m) => String(m.manager))])]
    const people = await User.find({ _id: { $in: recipientIds }, isDemo: { $ne: true } }).select('phone email').lean()
    const vars = { property: property?.name, priority: complaint.priority, title: complaint.title, name: tenant?.name }

    if (await inAppOn(complaint.organization)) {
      await createNotifications({
        recipients: people.map((p) => p._id), organization: complaint.organization, property: complaint.property,
        type: 'COMPLAINT_CREATED', title: 'New complaint', message: `${tenant?.name || 'A tenant'}: ${complaint.title}`,
        data: { complaintId: complaint._id },
      })
    }
    await Promise.all(people.map((p) => deliver({
      organization: complaint.organization, property: complaint.property, user: p._id, type: 'COMPLAINT_CREATED', vars,
      to: { phone: p.phone, email: p.email }, dedupeKey: `complaint:${complaint._id}:${p._id}`,
    })))
  })

export const notifyComplaintStatus = (complaint) =>
  safely('complaint-status', async () => {
    const tenant = await Tenant.findById(complaint.tenant).lean()
    if (!tenant) return
    const owner = await Organization.findById(complaint.organization).select('owner').lean()
    if ((await User.exists({ _id: owner?.owner, isDemo: true }))) return

    if (tenant.user && (await inAppOn(complaint.organization))) {
      await createNotifications({
        recipients: [tenant.user], organization: complaint.organization, property: complaint.property,
        type: 'COMPLAINT_STATUS_CHANGED', title: 'Complaint update',
        message: `"${complaint.title}" is now ${String(complaint.status).replace('_', ' ').toLowerCase()}.`,
        data: { complaintId: complaint._id },
      })
    }
    await deliver({
      organization: complaint.organization, property: complaint.property, tenant: tenant._id, type: 'COMPLAINT_STATUS_CHANGED',
      vars: { name: tenant.name.split(' ')[0], title: complaint.title, status: complaint.status },
      to: { phone: tenant.phone, email: tenant.email }, dedupeKey: `complaint-status:${complaint._id}:${complaint.status}`,
    })
  })

// kind: 'VERIFIED' | 'REJECTED'
export const notifyPaymentOutcome = (payment, kind) =>
  safely('payment-outcome', async () => {
    const [tenant, due] = await Promise.all([
      Tenant.findById(payment.tenant).lean(),
      RentDue.findById(payment.rentDue).select('billingMonth').lean(),
    ])
    if (!tenant) return
    await deliver({
      organization: payment.organization, property: payment.property, tenant: tenant._id, type: `PAYMENT_${kind}`,
      vars: { name: tenant.name.split(' ')[0], amount: payment.amount, billingMonth: due?.billingMonth, reason: payment.rejectionReason, receiptNumber: payment.receiptNumber },
      to: { phone: tenant.phone, email: tenant.email }, dedupeKey: `payment-${kind.toLowerCase()}:${payment._id}`,
    })
  })

// A tenant says they paid by UPI: tell the owner and the property's managers straight away so it gets verified.
export const notifyPaymentSubmitted = (payment) =>
  safely('payment-submitted', async () => {
    const [org, property, tenant, due, managers] = await Promise.all([
      Organization.findById(payment.organization).select('owner').lean(),
      Property.findById(payment.property).select('name').lean(),
      Tenant.findById(payment.tenant).select('name').lean(),
      RentDue.findById(payment.rentDue).select('billingMonth').lean(),
      PropertyManagerAssignment.find({ property: payment.property, status: 'ACTIVE' }).select('manager').lean(),
    ])
    const ids = [...new Set([String(org.owner), ...managers.map((m) => String(m.manager))])]
    const people = await User.find({ _id: { $in: ids }, isDemo: { $ne: true } }).select('phone email').lean()

    // Managers already get the in-app alert from the payment service; the owner did not, so add it here.
    if (await inAppOn(payment.organization)) {
      await createNotifications({
        recipients: [org.owner], organization: payment.organization, property: payment.property, type: 'PAYMENT_RECEIVED',
        title: 'Payment to verify', message: `${tenant?.name || 'A tenant'} submitted ₹${payment.amount} (UTR ${payment.transactionReference}).`,
        data: { paymentId: payment._id },
      })
    }
    await Promise.all(people.map((p) => deliver({
      organization: payment.organization, property: payment.property, user: p._id, type: 'PAYMENT_RECEIVED',
      vars: { name: tenant?.name, amount: payment.amount, billingMonth: due?.billingMonth, property: property?.name, reference: payment.transactionReference },
      to: { phone: p.phone, email: p.email }, dedupeKey: `payment-submitted:${payment._id}:${p._id}`,
    })))
  })

export const notifyAnnouncementExternal = (announcement, tenantIds) =>
  safely('announcement', async () => {
    const owner = await Organization.findById(announcement.organization).select('owner').lean()
    if ((await User.exists({ _id: owner?.owner, isDemo: true }))) return
    const tenants = await Tenant.find({ _id: { $in: tenantIds }, organization: announcement.organization, status: { $ne: 'LEFT' } }).lean()
    await Promise.all(tenants.map((t) => deliver({
      organization: announcement.organization, property: announcement.property, tenant: t._id, type: 'ANNOUNCEMENT',
      vars: { title: announcement.title, message: announcement.message },
      to: { phone: t.phone, email: t.email }, dedupeKey: `announcement:${announcement._id}:${t._id}`,
    })))
  })

// Login links for managers, staff and tenants. Goes by WhatsApp (or SMS) and, when known, e-mail.
export const sendInvitationMessage = ({ organization, property = null, propertyName, inviterName, name, role, link, phone, email }) =>
  safely('invitation', async () => {
    const settings = await getSettings(organization)
    await deliver({
      organization, property, type: 'INVITE', vars: { name, role, link, property: propertyName, inviter: inviterName },
      to: { phone, email }, force: [settings.channels?.whatsapp ? 'WHATSAPP' : 'SMS', 'EMAIL'],
    })
  })
