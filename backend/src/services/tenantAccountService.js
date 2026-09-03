import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import User from '../models/User.js'
import Tenant from '../models/Tenant.js'
import TenantInvitation from '../models/TenantInvitation.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'

import { PERMISSIONS } from '../constants/permissions.js'

const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// --------------------------------------------------
// PROPERTY ACCESS
// --------------------------------------------------

const checkTenantManagementAccess =
  async ({
    user,
    propertyId,
  }) => {
    if (!user.organization) {
      throw createError(
        'User is not associated with an organization.',
        400
      )
    }

    // BUSINESS OWNER
    if (
      user.role ===
      'BUSINESS_OWNER'
    ) {
      return
    }

    // PROPERTY MANAGER
    if (
      user.role !==
      'PROPERTY_MANAGER'
    ) {
      throw createError(
        'You are not authorized to manage tenant accounts.',
        403
      )
    }

    const assignment =
      await PropertyManagerAssignment.findOne(
        {
          manager: user._id,
          property: propertyId,
          status: 'ACTIVE',
        }
      )

    if (!assignment) {
      throw createError(
        'You are not assigned to this property.',
        403
      )
    }

    if (
      !assignment.permissions.includes(
        PERMISSIONS.ADD_TENANTS
      )
    ) {
      throw createError(
        'You do not have permission to perform this action.',
        403
      )
    }
  }

// --------------------------------------------------
// INVITE TENANT
// --------------------------------------------------

export const inviteTenant =
  async ({
    user,
    tenantId,
  }) => {
    const tenant =
      await Tenant.findOne({
        _id: tenantId,
        organization:
          user.organization,
      })

    if (!tenant) {
      throw createError(
        'Tenant not found.',
        404
      )
    }

    await checkTenantManagementAccess({
      user,
      propertyId:
        tenant.property,
    })

    // Tenant already has a linked account.
    if (tenant.user) {
      throw createError(
        'This tenant already has an account.',
        409
      )
    }

    if (!tenant.email) {
      throw createError(
        'Tenant must have an email address before an invitation can be sent.',
        400
      )
    }

    // --------------------------------------------------
    // CHECK EXISTING USER
    // --------------------------------------------------

    const existingUser =
      await User.findOne({
        $or: [
          {
            email: tenant.email,
          },
          {
            phone: tenant.phone,
          },
        ],
      })

    if (existingUser) {
      throw createError(
        'An account already exists with this email or phone number.',
        409
      )
    }

    // --------------------------------------------------
    // CANCEL OLD INVITATIONS
    // --------------------------------------------------

    await TenantInvitation.updateMany(
      {
        tenant: tenant._id,
        status: 'PENDING',
      },
      {
        $set: {
          status: 'CANCELLED',
        },
      }
    )

    // --------------------------------------------------
    // CREATE INVITATION TOKEN
    // --------------------------------------------------

    const rawToken =
      crypto.randomBytes(32).toString('hex')

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex')

    const expiresAt =
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      )

    // --------------------------------------------------
    // CREATE TENANT USER
    // --------------------------------------------------

    const tenantUser =
      await User.create({
        name: tenant.name,

        phone: tenant.phone,

        email: tenant.email,

        role: 'TENANT',

        organization:
          tenant.organization,

        status: 'INVITED',

        passwordHash: null,
      })

    // Link Tenant → User
    tenant.user =
      tenantUser._id

    await tenant.save()

    // --------------------------------------------------
    // CREATE INVITATION
    // --------------------------------------------------

    const invitation =
      await TenantInvitation.create({
        organization:
          tenant.organization,

        property:
          tenant.property,

        tenant:
          tenant._id,

        invitedBy:
          user._id,

        email:
          tenant.email,

        tokenHash,

        expiresAt,

        status: 'PENDING',
      })

    // --------------------------------------------------
    // INVITATION URL
    // --------------------------------------------------

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:5173'

    const invitationUrl =
      `${frontendUrl}/tenant/accept-invitation?token=${rawToken}`

    return {
      invitationId:
        invitation._id,

      tenantId:
        tenant._id,

      userId:
        tenantUser._id,

      expiresAt,

      invitationUrl,
    }
  }

// --------------------------------------------------
// ACCEPT TENANT INVITATION
// --------------------------------------------------

export const acceptTenantInvitation =
  async ({
    token,
    password,
  }) => {
    // --------------------------------------------------
    // HASH TOKEN
    // --------------------------------------------------

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')

    // --------------------------------------------------
    // FIND INVITATION
    // --------------------------------------------------

    const invitation =
      await TenantInvitation.findOne({
        tokenHash,
        status: 'PENDING',
      })

    if (!invitation) {
      throw createError(
        'Invalid or expired invitation.',
        400
      )
    }

    // --------------------------------------------------
    // CHECK EXPIRATION
    // --------------------------------------------------

    if (
      invitation.expiresAt <
      new Date()
    ) {
      invitation.status =
        'EXPIRED'

      await invitation.save()

      throw createError(
        'This invitation has expired.',
        400
      )
    }

    // --------------------------------------------------
    // FIND TENANT
    // --------------------------------------------------

    const tenant =
      await Tenant.findOne({
        _id:
          invitation.tenant,

        organization:
          invitation.organization,
      })

    if (!tenant) {
      throw createError(
        'Tenant not found.',
        404
      )
    }

    // --------------------------------------------------
    // TENANT MUST HAVE LINKED USER
    // --------------------------------------------------

    if (!tenant.user) {
      throw createError(
        'Tenant invitation account was not found.',
        404
      )
    }

    // --------------------------------------------------
    // FIND INVITED USER
    // --------------------------------------------------

    const user =
      await User.findOne({
        _id: tenant.user,

        organization:
          invitation.organization,

        role: 'TENANT',

        status: 'INVITED',
      }).select('+passwordHash')

    if (!user) {
      throw createError(
        'Tenant invitation account was not found or is no longer available.',
        404
      )
    }

    // --------------------------------------------------
    // PASSWORD
    // --------------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      )

    user.passwordHash =
      passwordHash

    user.status =
      'ACTIVE'

    user.isEmailVerified =
      true

    await user.save()

    // --------------------------------------------------
    // ACCEPT INVITATION
    // --------------------------------------------------

    invitation.status =
      'ACCEPTED'

    invitation.acceptedAt =
      new Date()

    await invitation.save()

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        organization:
          user.organization,
      },

      tenant: {
        id: tenant._id,
        name: tenant.name,
      },
    }
  }