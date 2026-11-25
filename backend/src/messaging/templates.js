import { CHANNELS } from './messenger.js'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const sign = '\n\n- The Hostel Yard'

// Which settings switch controls each message type.
export const TYPE_GROUP = {
  RENT_REMINDER: 'rent',
  RENT_OVERDUE: 'rent',
  PAYMENT_VERIFIED: 'payments',
  PAYMENT_REJECTED: 'payments',
  PAYMENT_RECEIVED: 'payments',
  COMPLAINT_CREATED: 'complaints',
  COMPLAINT_STATUS_CHANGED: 'complaints',
  ANNOUNCEMENT: 'announcements',
  DAILY_DIGEST: 'digest',
  INVITE: 'always',
  TEST: 'always',
  MOVE_OUT_NOTICE: 'always',
  ENQUIRY_NEW: 'always',
  KYC_REVIEWED: 'always',
  DOCUMENT_TO_SIGN: 'always',
  RESIDENT_FORM_LINK: 'always',
  GUEST_REQUEST: 'always',
  GUEST_APPROVED: 'always',
}

// Each template returns { title, body } from plain variables, so it is easy to test and to translate later.
export const TEMPLATES = {
  RENT_REMINDER: (v) => ({
    title: 'Rent reminder',
    body: v.daysLeft > 0
      ? `Hi ${v.name}, your rent of ${inr(v.balance)} for ${v.billingMonth} at ${v.property} is due in ${v.daysLeft} day${v.daysLeft === 1 ? '' : 's'} (${date(v.dueDate)}).${sign}`
      : `Hi ${v.name}, your rent of ${inr(v.balance)} for ${v.billingMonth} at ${v.property} is due today. Please pay and share the payment reference.${sign}`,
  }),
  RENT_OVERDUE: (v) => ({
    title: 'Rent overdue',
    body: `Hi ${v.name}, your rent of ${inr(v.balance)} for ${v.billingMonth} at ${v.property} was due on ${date(v.dueDate)} and is ${v.daysOverdue} day${v.daysOverdue === 1 ? '' : 's'} overdue. Please pay as soon as possible.${sign}`,
  }),
  PAYMENT_VERIFIED: (v) => ({
    title: 'Payment verified',
    body: `Hi ${v.name}, we received your payment of ${inr(v.amount)} for ${v.billingMonth}.${v.receiptNumber ? ` Receipt no. ${v.receiptNumber}.` : ''} Thank you!${sign}`,
  }),
  PAYMENT_RECEIVED: (v) => ({
    title: 'Payment to verify',
    body: `${v.name} says they paid ${inr(v.amount)} for ${v.billingMonth} at ${v.property} (UTR ${v.reference}). Check your bank and verify it in the app.${sign}`,
  }),
  PAYMENT_REJECTED: (v) => ({
    title: 'Payment rejected',
    body: `Hi ${v.name}, your payment of ${inr(v.amount)} for ${v.billingMonth} could not be verified${v.reason ? `: ${v.reason}` : ''}. Please check and submit again.${sign}`,
  }),
  COMPLAINT_CREATED: (v) => ({
    title: 'New complaint',
    body: `New complaint at ${v.property} (${v.priority}): ${v.title}. Raised by ${v.name}.${sign}`,
  }),
  COMPLAINT_STATUS_CHANGED: (v) => ({
    title: 'Complaint update',
    body: `Hi ${v.name}, your complaint "${v.title}" is now ${String(v.status).replace('_', ' ').toLowerCase()}.${sign}`,
  }),
  ANNOUNCEMENT: (v) => ({
    title: v.title,
    body: `${v.title}\n${v.message}${sign}`,
  }),
  DAILY_DIGEST: (v) => ({
    title: 'Daily summary',
    body: `Daily summary for ${v.date}:\n- Overdue rent: ${inr(v.overdueAmount)} from ${v.overdueCount} tenant(s)\n- Rent pending this month: ${inr(v.pendingAmount)}\n- Payments awaiting verification: ${v.pendingPayments}\n- Open complaints: ${v.openComplaints}${sign}`,
  }),
  INVITE: (v) => ({
    title: 'You are invited to The Hostel Yard',
    body: `Hi ${v.name}, ${v.inviter ? `${v.inviter} has invited you` : 'you have been invited'} to join ${v.property ? `${v.property} on ` : ''}The Hostel Yard as ${v.role}. Open this link to set up your account: ${v.link}${sign}`,
  }),
  MOVE_OUT_NOTICE: (v) => ({
    title: 'Move-out notice',
    body: `${v.name} (${v.property}${v.room ? `, room ${v.room}` : ''}) has given notice to move out on ${date(v.moveOutDate)}.${v.reason ? ` Reason: ${v.reason}.` : ''}${v.shortBy > 0 ? ` That is ${v.shortBy} day${v.shortBy === 1 ? '' : 's'} shorter than the notice period.` : ''}${sign}`,
  }),
  ENQUIRY_NEW: (v) => ({
    title: 'New enquiry',
    body: `New enquiry for ${v.property}: ${v.name}, ${v.phone}${v.sharing ? `, wants ${String(v.sharing).toLowerCase()} sharing` : ''}${v.moveInDate ? `, from ${date(v.moveInDate)}` : ''}.${v.message ? ` "${v.message}"` : ''} Reply quickly to book the visit.${sign}`,
  }),
  KYC_REVIEWED: (v) => ({
    title: v.approved ? 'Documents verified' : 'Documents need a fix',
    body: v.approved
      ? `Hi ${v.name}, your resident form and ID documents for ${v.property} are verified. Thank you!${sign}`
      : `Hi ${v.name}, your resident form for ${v.property} needs a correction${v.reason ? `: ${v.reason}` : ''}. Please open your link and update it${v.link ? `: ${v.link}` : ''}.${sign}`,
  }),
  DOCUMENT_TO_SIGN: (v) => ({
    title: 'Document to sign',
    body: `Hi ${v.name}, please read and e-sign your ${v.document} for ${v.property}: ${v.link}${sign}`,
  }),
  RESIDENT_FORM_LINK: (v) => ({
    title: 'Complete your resident form',
    body: `Hi ${v.name}, welcome to ${v.property}! Please fill in your resident form and upload your ID here: ${v.link}${sign}`,
  }),
  GUEST_REQUEST: (v) => ({
    title: 'Guest waiting for your approval',
    body: `Hi ${v.name}, ${v.visitor}${v.relation ? ` (${v.relation})` : ''}, ${v.visitorPhone}, wants to visit you at ${v.property} on ${date(v.date)}${v.time ? ` at ${v.time}` : ''}. Approve or decline here: ${v.link}\nIf you do not know this person, decline.${sign}`,
  }),
  GUEST_APPROVED: (v) => ({
    title: 'Your guest pass',
    body: `Hi ${v.name}, ${v.resident} approved your visit to ${v.property} on ${date(v.date)}. Show code ${v.code} at the gate: ${v.link}${sign}`,
  }),
  TEST: (v) => ({
    title: 'Test message',
    body: `This is a test message from The Hostel Yard. Your ${v.channel} notifications are working.${sign}`,
  }),
}

export { CHANNELS }
