import User from '../models/User.js'
import Property from '../models/Property.js'
import ManagerInvitation from '../models/ManagerInvitation.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { MANAGER_ALLOWED_PERMISSIONS } from '../constants/managerPermissions.js'
import { generateInvitationToken } from '../utils/invitationToken.js'
import { sendInvitationMessage } from './eventMessaging.js'

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

// Organisation is compared after loading: some old records stored it as text instead of an ObjectId.
const sameOrg = (doc, owner) => Boolean(doc?.organization) && String(doc.organization) === String(owner.organization)

const loadManager = async (owner, managerId) => {
  const manager = await User.findOne({ _id: managerId, role: 'PROPERTY_MANAGER' })
  if (!manager || !sameOrg(manager, owner)) throw fail('Manager not found.', 404)
  return manager
}

const checkPermissions = (permissions) => {
  if (permissions.some((p) => !MANAGER_ALLOWED_PERMISSIONS.includes(p))) throw fail('One or more permissions are not allowed for managers.')
}

const present = (manager, assignments) => ({
  _id: manager._id, name: manager.name, phone: manager.phone, email: manager.email, status: manager.status, lastLoginAt: manager.lastLoginAt,
  properties: assignments.map((a) => ({ _id: a.property?._id, name: a.property?.name, status: a.status, permissions: a.permissions })),
})

export const listManagers = async ({ owner }) => {
  if (!owner.organization) throw fail('User is not associated with an organization.')
  const users = (await User.find({ role: 'PROPERTY_MANAGER' }).sort({ name: 1 })).filter((u) => sameOrg(u, owner))
  const assignments = await PropertyManagerAssignment.find({ manager: { $in: users.map((u) => u._id) }, status: { $ne: 'REMOVED' } }).populate('property', 'name')

  // Waiting invitations, including ones whose link has run out: those still need a new link.
  const invitations = await ManagerInvitation.find({ organization: owner.organization, status: { $in: ['PENDING', 'EXPIRED'] } })
    .populate('property', 'name').sort({ createdAt: -1 })

  return {
    managers: users.map((u) => present(u, assignments.filter((a) => String(a.manager) === String(u._id)))),
    invitations: invitations.map((i) => ({ _id: i._id, managerName: i.managerName, phone: i.phone, email: i.email, property: i.property, expiresAt: i.expiresAt, expired: i.status === 'EXPIRED' || i.expiresAt < new Date() })),
  }
}

export const getManager = async ({ owner, managerId }) => {
  const manager = await loadManager(owner, managerId)
  const assignments = await PropertyManagerAssignment.find({ manager: manager._id, status: { $ne: 'REMOVED' } }).populate('property', 'name')
  return present(manager, assignments)
}

export const updateManagerProfile = async ({ owner, managerId, data }) => {
  const manager = await loadManager(owner, managerId)
  if (data.phone && data.phone !== manager.phone && (await User.exists({ phone: data.phone, _id: { $ne: manager._id } }))) throw fail('Another account already uses this phone number.', 409)
  if (data.email && data.email !== manager.email && (await User.exists({ email: data.email, _id: { $ne: manager._id } }))) throw fail('Another account already uses this e-mail.', 409)
  Object.assign(manager, data)
  await manager.save()
  return getManager({ owner, managerId })
}

// A suspended manager cannot sign in until reactivated.
export const setManagerStatus = async ({ owner, managerId, status }) => {
  const manager = await loadManager(owner, managerId)
  manager.status = status
  manager.tokenVersion = (manager.tokenVersion || 0) + 1
  await manager.save()
  return getManager({ owner, managerId })
}

export const assignManagerToProperty = async ({ owner, managerId, propertyId, permissions }) => {
  const manager = await loadManager(owner, managerId)
  const property = await Property.findOne({ _id: propertyId, organization: owner.organization, status: 'ACTIVE' })
  if (!property) throw fail('Property not found in your organization.', 404)
  checkPermissions(permissions)

  const existing = await PropertyManagerAssignment.findOne({ manager: manager._id, property: propertyId })
  if (existing) {
    existing.status = 'ACTIVE'
    existing.permissions = permissions
    existing.removedAt = null
    await existing.save()
  } else {
    await PropertyManagerAssignment.create({ manager: manager._id, property: propertyId, assignedBy: owner._id, permissions })
  }
  return getManager({ owner, managerId })
}

export const removeManagerFromProperty = async ({ owner, managerId, propertyId }) => {
  const manager = await loadManager(owner, managerId)
  const assignment = await PropertyManagerAssignment.findOne({ manager: manager._id, property: propertyId, status: { $ne: 'REMOVED' } })
  if (!assignment) throw fail('Manager is not assigned to this property.', 404)
  assignment.status = 'REMOVED'
  assignment.removedAt = new Date()
  await assignment.save()
  return getManager({ owner, managerId })
}

export const cancelInvitation = async ({ owner, invitationId }) => {
  const invitation = await ManagerInvitation.findOne({ _id: invitationId, organization: owner.organization, status: 'PENDING' })
  if (!invitation) throw fail('Invitation not found.', 404)
  invitation.status = 'CANCELLED'
  await invitation.save()
  return { cancelled: true }
}

// Gives a waiting invitation a fresh link (the old one stops working). The raw link cannot be rebuilt from what is
// stored, because only a hash of it is kept, so a new token is made.
export const resendInvitation = async ({ owner, invitationId }) => {
  const invitation = await ManagerInvitation.findOne({ _id: invitationId, organization: owner.organization, status: { $in: ['PENDING', 'EXPIRED'] } }).populate('property', 'name')
  if (!invitation) throw fail('Invitation not found.', 404)

  if (await User.exists({ phone: invitation.phone })) throw fail('This phone number is already registered, so there is nothing to invite.', 409)

  const { token, tokenHash } = generateInvitationToken()
  invitation.invitationTokenHash = tokenHash
  invitation.status = 'PENDING'
  invitation.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  await invitation.save()

  const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/manager/activate/${token}`
  await sendInvitationMessage({
    organization: owner.organization, property: invitation.property?._id, propertyName: invitation.property?.name, inviterName: owner.name,
    name: invitation.managerName, role: 'a property manager', link: invitationLink, phone: invitation.phone, email: invitation.email,
  })

  return {
    invitationLink,
    expiresAt: invitation.expiresAt,
    manager: { name: invitation.managerName, phone: invitation.phone },
    property: { name: invitation.property?.name },
  }
}
