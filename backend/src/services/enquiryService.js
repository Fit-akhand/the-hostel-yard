import mongoose from 'mongoose'

import Enquiry, { ENQUIRY_STATUSES } from '../models/Enquiry.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { normalizePhone } from '../messaging/phone.js'
import { accessiblePropertyIds, checkPropertyAccess, createError } from './access.js'

const VIEW = [PERMISSIONS.VIEW_BOOKINGS, PERMISSIONS.MANAGE_BOOKINGS]

const loadEnquiry = async (user, id, permission = VIEW) => {
  const enquiry = await Enquiry.findOne({ _id: id, organization: user.organization })
  if (!enquiry) throw createError('Enquiry not found.', 404)
  await checkPropertyAccess({ user, propertyId: enquiry.property, permission })
  return enquiry
}

export const listEnquiries = async ({ user, status, propertyId, search }) => {
  const allowed = (await accessiblePropertyIds(user, VIEW)).map(String)
  if (!allowed.length) return { enquiries: [], counts: {} }
  if (propertyId && !allowed.includes(String(propertyId))) throw createError('You are not assigned to this property.', 403)

  const toId = (id) => new mongoose.Types.ObjectId(String(id))
  const base = {
    organization: toId(user.organization),
    property: propertyId ? toId(propertyId) : { $in: allowed.map(toId) },
  }
  const filter = { ...base }
  if (status && status !== 'ALL') {
    filter.status = status === 'OPEN' ? { $in: ['NEW', 'CONTACTED', 'VISIT_SCHEDULED'] } : status
  }
  if (search) {
    const text = String(search).trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (text) filter.$or = [{ name: { $regex: text, $options: 'i' } }, { phone: { $regex: text } }]
  }

  const [enquiries, grouped] = await Promise.all([
    Enquiry.find(filter).populate('property', 'name').sort({ createdAt: -1 }).limit(300).lean(),
    Enquiry.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const counts = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]))
  for (const g of grouped) counts[g._id] = g.n
  return { enquiries, counts }
}

export const getEnquiry = async ({ user, id }) => {
  const enquiry = await loadEnquiry(user, id)
  return enquiry.populate([{ path: 'property', select: 'name' }, { path: 'tenant', select: 'name status' }])
}

export const createEnquiry = async ({ user, data }) => {
  await checkPropertyAccess({ user, propertyId: data.propertyId, permission: PERMISSIONS.MANAGE_BOOKINGS })
  const phone = normalizePhone(data.phone)
  if (!phone) throw createError('Enter a valid 10-digit mobile number.', 400)
  return Enquiry.create({
    organization: user.organization,
    property: data.propertyId,
    name: data.name,
    phone,
    email: data.email || null,
    gender: data.gender || null,
    sharing: data.sharing || null,
    moveInDate: data.moveInDate || null,
    message: data.message || '',
    source: data.source || 'WALK_IN',
    createdBy: user._id,
  })
}

export const updateEnquiry = async ({ user, id, data }) => {
  const enquiry = await loadEnquiry(user, id, PERMISSIONS.MANAGE_BOOKINGS)

  if (data.status) {
    enquiry.status = data.status
    if (data.status === 'LOST') enquiry.lostReason = data.lostReason || enquiry.lostReason || null
  }
  if (data.followUpOn !== undefined) enquiry.followUpOn = data.followUpOn || null
  if (data.visitOn !== undefined) {
    enquiry.visitOn = data.visitOn || null
    if (data.visitOn && ['NEW', 'CONTACTED'].includes(enquiry.status) && !data.status) enquiry.status = 'VISIT_SCHEDULED'
  }
  if (data.tenantId) {
    enquiry.tenant = data.tenantId
    enquiry.status = 'CONVERTED'
  }
  if (data.note) enquiry.notes.push({ text: data.note, by: user._id, byName: user.name })

  await enquiry.save()
  return enquiry.populate([{ path: 'property', select: 'name' }, { path: 'tenant', select: 'name status' }])
}
