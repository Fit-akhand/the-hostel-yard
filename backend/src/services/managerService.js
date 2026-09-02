import ManagerInvitation from '../models/ManagerInvitation.js'
import Property from '../models/Property.js'
import User from '../models/User.js'
import bcrypt from 'bcryptjs'

import {
  generateInvitationToken,
  hashInvitationToken,
} from '../utils/invitationToken.js'

import { MANAGER_ALLOWED_PERMISSIONS } from '../constants/managerPermissions.js'

import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

export const createManagerInvitation = async ({
  user,
  managerData,
}) => {
  if (!user.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  const {
    managerName,
    phone,
    email,
    propertyId,
    permissions,
  } = managerData

  // 1. Verify property belongs to owner organization
  const property = await Property.findOne({
    _id: propertyId,
    organization: user.organization,
    status: 'ACTIVE',
  })

  if (!property) {
    const error = new Error(
      'Property not found in your organization.'
    )

    error.statusCode = 404
    throw error
  }

  // 2. Validate manager permissions
  const invalidPermissions =
    permissions.filter(
      (permission) =>
        !MANAGER_ALLOWED_PERMISSIONS.includes(
          permission
        )
    )

  if (invalidPermissions.length > 0) {
    const error = new Error(
      'One or more requested permissions are not allowed for managers.'
    )

    error.statusCode = 400
    throw error
  }

  // 3. Check existing user
  const existingUser = await User.findOne({
    phone,
  })

  if (existingUser) {
    const error = new Error(
      'This phone number is already registered.'
    )

    error.statusCode = 409
    throw error
  }

  // 4. Remove old pending invitation
  await ManagerInvitation.deleteMany({
    organization: user.organization,
    property: property._id,
    phone,
    status: 'PENDING',
  })

  // 5. Generate secure invitation token
  const {
    token,
    tokenHash,
  } = generateInvitationToken()

  // 6. Invitation expires in 24 hours
  const expiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  )

  // 7. Create invitation
  const invitation =
    await ManagerInvitation.create({
      organization: user.organization,
      property: property._id,
      managerName,
      phone,
      email: email || null,
      permissions,
      invitedBy: user._id,

      invitationTokenHash: tokenHash,

      status: 'PENDING',

      expiresAt,
    })

  // 8. Build activation URL
  const frontendUrl =
    process.env.FRONTEND_URL ||
    'http://localhost:5173'

  const invitationLink =
    `${frontendUrl}/manager/activate/${token}`

  return {
    invitationId: invitation._id,

    manager: {
      name: managerName,
      phone,
      email: email || null,
    },

    property: {
      id: property._id,
      name: property.name,
    },

    permissions,

    invitationLink,

    expiresAt,
  }
}

export const getManagerInvitation = async ({
  token,
}) => {
  if (!token) {
    const error = new Error(
      'Invitation token is required.'
    )

    error.statusCode = 400
    throw error
  }

  const tokenHash =
    hashInvitationToken(token)

  const invitation =
    await ManagerInvitation.findOne({
      invitationTokenHash: tokenHash,
    })
      .populate(
        'property',
        'name type city state'
      )
      .lean()

  if (!invitation) {
    const error = new Error(
      'Invalid invitation link.'
    )

    error.statusCode = 404
    throw error
  }

  if (invitation.status !== 'PENDING') {
    const error = new Error(
      'This invitation is no longer active.'
    )

    error.statusCode = 400
    throw error
  }

  if (invitation.expiresAt < new Date()) {
    await ManagerInvitation.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: 'EXPIRED',
        },
      }
    )

    const error = new Error(
      'This invitation has expired.'
    )

    error.statusCode = 400
    throw error
  }

  return {
    invitationId: invitation._id,

    manager: {
      name: invitation.managerName,
      phone: invitation.phone,
      email: invitation.email,
    },

    property: {
      id: invitation.property._id,
      name: invitation.property.name,
      type: invitation.property.type,
      city: invitation.property.city,
      state: invitation.property.state,
    },

    role: 'PROPERTY_MANAGER',

    permissions: invitation.permissions,

    expiresAt: invitation.expiresAt,
  }
}

export const activateManager = async ({
  token,
  password,
}) => {
  if (!token) {
    const error = new Error(
      'Invitation token is required.'
    )

    error.statusCode = 400
    throw error
  }

  const tokenHash =
    hashInvitationToken(token)

  const invitation =
    await ManagerInvitation.findOne({
      invitationTokenHash: tokenHash,
    })

  if (!invitation) {
    const error = new Error(
      'Invalid invitation link.'
    )

    error.statusCode = 404
    throw error
  }

  if (invitation.status !== 'PENDING') {
    const error = new Error(
      'This invitation is no longer active.'
    )

    error.statusCode = 400
    throw error
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = 'EXPIRED'

    await invitation.save()

    const error = new Error(
      'This invitation has expired.'
    )

    error.statusCode = 400
    throw error
  }

  // Make sure the phone wasn't registered
  // after the invitation was created.
  const existingUser =
    await User.findOne({
      phone: invitation.phone,
    })

  if (existingUser) {
    const error = new Error(
      'An account with this phone number already exists.'
    )

    error.statusCode = 409
    throw error
  }

  const passwordHash =
    await bcrypt.hash(password, 12)

  const user = await User.create({
  name: invitation.managerName,
  phone: invitation.phone,
  email: invitation.email,
  organization: invitation.organization,
  role: 'PROPERTY_MANAGER',
  status: 'ACTIVE',
  passwordHash,
  isPhoneVerified: false,
})

  const assignment =
    await PropertyManagerAssignment.create({
      manager: user._id,
      property: invitation.property,
      assignedBy: invitation.invitedBy,
      permissions: invitation.permissions,
      status: 'ACTIVE',
    })

  invitation.status = 'ACTIVATED'
  invitation.activatedAt = new Date()

  await invitation.save()

  return {
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
    },

    assignment: {
      id: assignment._id,
      property: assignment.property,
      permissions: assignment.permissions,
      status: assignment.status,
    },
  }
}

export const updateManagerPermissions = async ({
  owner,
  managerId,
  propertyId,
  permissions,
}) => {
  if (!owner.organization) {
    const error = new Error(
      'User is not associated with an organization.'
    )

    error.statusCode = 400
    throw error
  }

  // Verify property belongs to owner's organization
  const property = await Property.findOne({
    _id: propertyId,
    organization: owner.organization,
    status: 'ACTIVE',
  })

  if (!property) {
    const error = new Error(
      'Property not found in your organization.'
    )

    error.statusCode = 404
    throw error
  }

  // Organization is compared after load: querying it as ObjectId
  // misses documents where organization was stored as a string.
  const manager = await User.findOne({
    _id: managerId,
    role: 'PROPERTY_MANAGER',
    status: 'ACTIVE',
  })

  const sameOrganization =
    Boolean(manager?.organization) &&
    Boolean(owner.organization) &&
    String(manager.organization) === String(owner.organization)

  if (!manager || !sameOrganization) {
    const error = new Error(
      'Property manager not found.'
    )

    error.statusCode = 404
    throw error
  }

  // Only allowed manager permissions
  const invalidPermissions =
    permissions.filter(
      (permission) =>
        !MANAGER_ALLOWED_PERMISSIONS.includes(
          permission
        )
    )

  if (invalidPermissions.length > 0) {
    const error = new Error(
      'One or more permissions are not allowed for managers.'
    )

    error.statusCode = 400
    throw error
  }

  const assignment =
    await PropertyManagerAssignment.findOne({
      manager: managerId,
      property: propertyId,
      status: 'ACTIVE',
    })

  if (!assignment) {
    const error = new Error(
      'Manager is not assigned to this property.'
    )

    error.statusCode = 404
    throw error
  }

  assignment.permissions = permissions

  await assignment.save()

  return assignment
}