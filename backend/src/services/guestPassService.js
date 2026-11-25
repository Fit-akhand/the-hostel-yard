import crypto from 'crypto'

import GuestPass from '../models/GuestPass.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { deliver } from '../messaging/deliveryService.js'
import { normalizePhone } from '../messaging/phone.js'
import { effectiveStatus, newCode, readLink, signLink, todayInIndia, visitDateProblem } from '../utils/passRules.js'
import {
  accessiblePropertyIds, checkPropertyAccess, createError, isDemoOrganization, isOwner,
  notifyStaff, notifyTenantInApp, tenantForUser,
} from './access.js'

const GATE = [PERMISSIONS.VIEW_TENANTS]
const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const passUrl = (pass) => `${frontendUrl()}/pass/${signLink('view', String(pass._id))}`
const approvalUrl = (pass) => `${frontendUrl()}/guest/${signLink('approve', String(pass._id))}`
const firstName = (name) => String(name || '').trim().split(/\s+/)[0]

const requirePhone = (value, label) => {
  const phone = normalizePhone(value)
  if (!phone) throw createError(`Enter a valid 10-digit mobile number for ${label}.`, 400)
  return phone
}

const requireDate = (day) => {
  const problem = visitDateProblem(day)
  if (problem) throw createError(problem, 400)
}

const visitorFields = (data) => ({
  visitorName: data.visitorName,
  relation: data.relation || '',
  purpose: data.purpose || '',
  guests: data.guests || 1,
  visitDate: data.visitDate,
  expectedTime: data.expectedTime || '',
})

// --------------------------------------------------
// MESSAGES
// --------------------------------------------------

const askResident = async (pass, tenant, propertyName) => {
  notifyTenantInApp({
    tenant,
    type: 'GUEST_REQUEST',
    title: 'Guest waiting for your approval',
    message: `${pass.visitorName} wants to visit you. Open "Guests" to approve or decline.`,
    data: { passId: pass._id },
  })
  if (await isDemoOrganization(pass.organization)) return
  const link = approvalUrl(pass)
  await deliver({
    organization: pass.organization,
    property: pass.property,
    tenant: tenant._id,
    type: 'GUEST_REQUEST',
    vars: {
      name: firstName(tenant.name), visitor: pass.visitorName, visitorPhone: pass.visitorPhone, relation: pass.relation,
      property: propertyName, date: pass.visitDate, time: pass.expectedTime, link,
    },
    to: { phone: tenant.phone, email: tenant.email },
    dedupeKey: `guest-request:${pass._id}`,
    redact: [link],
  })
}

const tellVisitor = async (pass, tenant, propertyName) => {
  if (await isDemoOrganization(pass.organization)) return
  const link = passUrl(pass)
  await deliver({
    organization: pass.organization,
    property: pass.property,
    tenant: tenant._id,
    type: 'GUEST_APPROVED',
    vars: { name: firstName(pass.visitorName), resident: firstName(tenant.name), property: propertyName, date: pass.visitDate, code: pass.code, link },
    to: { phone: pass.visitorPhone },
    dedupeKey: `guest-approved:${pass._id}`,
    redact: [link, pass.code],
  })
}

const background = (work) => work.catch((error) => console.error('[guest-pass] message failed:', error.message))

// --------------------------------------------------
// SHARED RULES
// --------------------------------------------------

const uniqueCode = async (propertyId, visitDate) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newCode()
    if (!(await GuestPass.exists({ property: propertyId, visitDate, code }))) return code
  }
  throw createError('Could not create a pass code. Please try again.', 500)
}

const view = (pass) => {
  const doc = pass.toObject ? pass.toObject() : pass
  return { ...doc, status: effectiveStatus(doc) }
}

// The resident's answer. This is the only way a visit request becomes approved.
const decide = async (pass, { decision, reason }, via) => {
  const status = effectiveStatus(pass)
  if (status === 'EXPIRED') throw createError('This request has expired.', 410)
  if (status !== 'PENDING') throw createError(`This request was already ${status === 'REJECTED' ? 'declined' : status.toLowerCase().replace('_', ' ')}.`, 409)

  const approved = decision === 'APPROVE'
  const update = {
    status: approved ? 'APPROVED' : 'REJECTED',
    decidedAt: new Date(),
    decidedVia: via,
    code: approved ? await uniqueCode(pass.property, pass.visitDate) : null,
    rejectReason: approved ? null : reason?.trim() || null,
  }
  // Only one answer wins if the link and the app are used at the same moment.
  const saved = await GuestPass.findOneAndUpdate({ _id: pass._id, status: 'PENDING' }, { $set: update }, { returnDocument: 'after' })
  if (!saved) throw createError('This request was already answered.', 409)

  const [tenant, property] = await Promise.all([Tenant.findById(saved.tenant), Property.findById(saved.property).select('name').lean()])
  notifyStaff({
    organization: saved.organization,
    property: saved.property,
    type: 'GUEST_DECIDED',
    title: approved ? 'Guest approved' : 'Guest declined',
    message: `${tenant?.name || 'A resident'} ${approved ? 'approved' : 'declined'} ${saved.visitorName} for ${saved.visitDate}.`,
    data: { passId: saved._id },
    external: false,
  })
  if (approved && tenant) background(tellVisitor(saved, tenant, property?.name))
  return saved
}

// --------------------------------------------------
// VISITOR (no sign-in): gate QR form and pass page
// --------------------------------------------------

const gateProperty = async (code) => {
  const property = await Property.findOne({ visitorCode: String(code || ''), status: 'ACTIVE' }).select('name city organization').lean()
  if (!property) throw createError('This visitor page does not exist. Scan the QR code at the gate again.', 404)
  return property
}

export const getGateInfo = async (code) => {
  const property = await gateProperty(code)
  return { property: { name: property.name, city: property.city } }
}

export const requestVisit = async (code, data) => {
  const property = await gateProperty(code)
  const visitorPhone = requirePhone(data.visitorPhone, 'yourself')
  const residentPhone = requirePhone(data.residentPhone, 'the resident')
  requireDate(data.visitDate)

  const residents = await Tenant.find({ property: property._id, status: { $ne: 'LEFT' } }).select('name phone email user organization property')
  const tenant = residents.find((t) => normalizePhone(t.phone) === residentPhone) || null

  const same = await GuestPass.findOne({
    property: property._id, tenant: tenant?._id || null, visitorPhone, visitDate: data.visitDate, status: 'PENDING',
  })
  const pass = same || (await GuestPass.create({
    ...visitorFields(data),
    visitorPhone,
    organization: property.organization,
    property: property._id,
    tenant: tenant?._id || null,
    source: 'GATE_QR',
  }))
  if (!same && tenant) background(askResident(pass, tenant, property.name))

  // The same answer whether or not the number matched a resident.
  return { token: signLink('view', String(pass._id)) }
}

export const getVisitorPass = async (token) => {
  const id = readLink('view', token)
  const pass = id ? await GuestPass.findById(id).populate('property', 'name address city').populate('tenant', 'name').lean() : null
  if (!pass) throw createError('This pass link is not valid.', 404)
  const status = effectiveStatus(pass)
  const approved = ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(status)
  return {
    status,
    visitorName: pass.visitorName,
    guests: pass.guests,
    visitDate: pass.visitDate,
    expectedTime: pass.expectedTime,
    property: { name: pass.property?.name, address: pass.property?.address, city: pass.property?.city },
    // The resident's name and the gate code appear only after the resident has approved.
    residentName: approved ? firstName(pass.tenant?.name) : null,
    code: ['APPROVED', 'CHECKED_IN'].includes(status) ? pass.code : null,
  }
}

// --------------------------------------------------
// RESIDENT'S PRIVATE APPROVAL LINK (sent to their phone)
// --------------------------------------------------

const passFromApprovalLink = async (token) => {
  const id = readLink('approve', token)
  const pass = id ? await GuestPass.findById(id) : null
  if (!pass || !pass.tenant) throw createError('This approval link is not valid.', 404)
  return pass
}

const approvalView = async (pass) => {
  const [tenant, property] = await Promise.all([
    Tenant.findById(pass.tenant).select('name status').lean(),
    Property.findById(pass.property).select('name').lean(),
  ])
  if (!tenant || tenant.status === 'LEFT') throw createError('This approval link is no longer active.', 410)
  return {
    status: effectiveStatus(pass),
    residentName: firstName(tenant.name),
    propertyName: property?.name,
    visitorName: pass.visitorName,
    visitorPhone: pass.visitorPhone,
    relation: pass.relation,
    purpose: pass.purpose,
    guests: pass.guests,
    visitDate: pass.visitDate,
    expectedTime: pass.expectedTime,
  }
}

export const getApproval = async (token) => approvalView(await passFromApprovalLink(token))

export const decideByLink = async (token, input) => {
  const pass = await passFromApprovalLink(token)
  await approvalView(pass)
  return approvalView(await decide(pass, input, 'LINK'))
}

// --------------------------------------------------
// SIGNED-IN RESIDENT
// --------------------------------------------------

const withPassLink = (pass) => {
  const doc = view(pass)
  return { ...doc, passUrl: doc.status === 'APPROVED' ? passUrl(doc) : null }
}

const myPass = async (user, id) => {
  const tenant = await tenantForUser(user)
  const pass = await GuestPass.findOne({ _id: id, tenant: tenant._id })
  if (!pass) throw createError('Guest request not found.', 404)
  return { tenant, pass }
}

export const listMyPasses = async (user) => {
  const tenant = await tenantForUser(user)
  const passes = await GuestPass.find({ tenant: tenant._id }).sort({ createdAt: -1 }).limit(100).lean()
  return { passes: passes.map(withPassLink) }
}

export const decideMine = async (user, id, input) => {
  const { pass } = await myPass(user, id)
  return withPassLink(await decide(pass, input, 'APP'))
}

// A resident invites their own guest: approved straight away, ready to share.
export const inviteGuest = async (user, data) => {
  const tenant = await tenantForUser(user)
  if (tenant.status === 'LEFT') throw createError('You have moved out.', 400)
  requireDate(data.visitDate)
  const visitorPhone = requirePhone(data.visitorPhone, 'your guest')
  const property = tenant.property?._id || tenant.property

  const open = await GuestPass.countDocuments({ tenant: tenant._id, status: 'APPROVED', visitDate: { $gte: todayInIndia() } })
  if (open >= 10) throw createError('You already have 10 upcoming guest passes. Cancel one first.', 400)

  const pass = await GuestPass.create({
    ...visitorFields(data),
    visitorPhone,
    organization: tenant.organization,
    property,
    tenant: tenant._id,
    source: 'RESIDENT',
    status: 'APPROVED',
    code: await uniqueCode(property, data.visitDate),
    decidedAt: new Date(),
    decidedVia: 'INVITE',
    createdBy: user._id,
  })
  return withPassLink(pass)
}

export const cancelMine = async (user, id) => {
  const { pass } = await myPass(user, id)
  if (!['PENDING', 'APPROVED'].includes(effectiveStatus(pass))) throw createError('This pass can no longer be cancelled.', 400)
  pass.status = 'CANCELLED'
  pass.cancelledAt = new Date()
  pass.cancelledBy = 'RESIDENT'
  await pass.save()
  return view(pass)
}

// --------------------------------------------------
// OWNER / MANAGER / STAFF (the gate)
// --------------------------------------------------

const VIEWS = {
  today: (today) => ({ visitDate: today, tenant: { $ne: null } }),
  waiting: (today) => ({ status: 'PENDING', visitDate: { $gte: today }, tenant: { $ne: null } }),
  inside: () => ({ status: 'CHECKED_IN' }),
  upcoming: (today) => ({ status: 'APPROVED', visitDate: { $gt: today } }),
  history: () => ({ tenant: { $ne: null } }),
}

export const listPasses = async ({ user, view: name = 'today', propertyId }) => {
  const allowed = (await accessiblePropertyIds(user, GATE)).map(String)
  if (propertyId && !allowed.includes(String(propertyId))) throw createError('You are not assigned to this property.', 403)
  const today = todayInIndia()
  const base = { organization: user.organization, property: propertyId || { $in: allowed } }

  const [passes, waiting, inside, expected] = await Promise.all([
    GuestPass.find({ ...base, ...(VIEWS[name] || VIEWS.today)(today) })
      .populate('tenant', 'name phone').populate('property', 'name')
      .sort({ visitDate: -1, createdAt: -1 }).limit(200).lean(),
    GuestPass.countDocuments({ ...base, ...VIEWS.waiting(today) }),
    GuestPass.countDocuments({ ...base, ...VIEWS.inside() }),
    GuestPass.countDocuments({ ...base, status: 'APPROVED', visitDate: today }),
  ])
  return { passes: passes.map(view), counts: { waiting, inside, expected }, today }
}

const gatePass = async (user, id) => {
  const pass = await GuestPass.findOne({ _id: id, organization: user.organization })
  if (!pass) throw createError('Guest pass not found.', 404)
  await checkPropertyAccess({ user, propertyId: pass.property, permission: GATE })
  return pass
}

const populated = async (pass) => view(await pass.populate([{ path: 'tenant', select: 'name phone' }, { path: 'property', select: 'name' }]))

export const verifyCode = async ({ user, code }) => {
  const allowed = await accessiblePropertyIds(user, GATE)
  const pass = await GuestPass.findOne({
    organization: user.organization, property: { $in: allowed }, code, visitDate: { $gte: todayInIndia() },
  }).sort({ visitDate: 1 })
  if (!pass) throw createError('No pass has this code for today or later. Check the digits.', 404)
  return populated(pass)
}

export const checkIn = async ({ user, id }) => {
  const pass = await gatePass(user, id)
  const status = effectiveStatus(pass)
  if (status === 'PENDING') throw createError('The resident has not approved this visit yet.', 400)
  if (status !== 'APPROVED') throw createError(`This pass is ${status.toLowerCase().replace('_', ' ')}.`, 400)
  if (pass.visitDate !== todayInIndia()) throw createError(`This pass is for ${pass.visitDate}, not today.`, 400)
  pass.status = 'CHECKED_IN'
  pass.checkedInAt = new Date()
  pass.checkedInBy = user._id
  await pass.save()

  const tenant = await Tenant.findById(pass.tenant)
  notifyTenantInApp({ tenant, type: 'GUEST_DECIDED', title: 'Your guest has arrived', message: `${pass.visitorName} was checked in at the gate.`, data: { passId: pass._id } })
  return populated(pass)
}

export const checkOut = async ({ user, id }) => {
  const pass = await gatePass(user, id)
  if (pass.status !== 'CHECKED_IN') throw createError('This guest is not checked in.', 400)
  pass.status = 'CHECKED_OUT'
  pass.checkedOutAt = new Date()
  pass.checkedOutBy = user._id
  await pass.save()
  return populated(pass)
}

// The gate may turn a visitor away, but can never approve on the resident's behalf.
export const cancelAtGate = async ({ user, id }) => {
  const pass = await gatePass(user, id)
  if (!['PENDING', 'APPROVED'].includes(effectiveStatus(pass))) throw createError('This pass can no longer be cancelled.', 400)
  pass.status = 'CANCELLED'
  pass.cancelledAt = new Date()
  pass.cancelledBy = 'STAFF'
  await pass.save()
  return populated(pass)
}

// A visitor without a smartphone: the guard enters their details and the resident is asked as usual.
export const requestAtGate = async ({ user, data }) => {
  const tenant = await Tenant.findOne({ _id: data.tenantId, organization: user.organization, status: { $ne: 'LEFT' } })
  if (!tenant) throw createError('Resident not found.', 404)
  await checkPropertyAccess({ user, propertyId: tenant.property, permission: GATE })
  requireDate(data.visitDate)
  const visitorPhone = requirePhone(data.visitorPhone, 'the visitor')

  const pass = await GuestPass.create({
    ...visitorFields(data),
    visitorPhone,
    organization: tenant.organization,
    property: tenant.property,
    tenant: tenant._id,
    source: 'STAFF',
    createdBy: user._id,
  })
  const property = await Property.findById(tenant.property).select('name').lean()
  background(askResident(pass, tenant, property?.name))

  return {
    pass: await populated(pass),
    reachable: Boolean(tenant.user || normalizePhone(tenant.phone) || tenant.email),
  }
}

// The link behind the gate QR code. A new code (owner only) makes old printed posters stop working.
export const getGateLink = async ({ user, propertyId, reset = false }) => {
  await checkPropertyAccess({ user, propertyId, permission: GATE })
  if (reset && !isOwner(user)) throw createError('Only the owner can replace the gate QR code.', 403)
  const property = await Property.findById(propertyId)
  if (!property.visitorCode || reset) {
    property.visitorCode = crypto.randomBytes(9).toString('base64url')
    await property.save()
  }
  return { propertyName: property.name, code: property.visitorCode, url: `${frontendUrl()}/visit/${property.visitorCode}` }
}
