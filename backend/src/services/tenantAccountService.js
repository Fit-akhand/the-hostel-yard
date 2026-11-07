import Property from '../models/Property.js'
import { sendInvitationMessage } from './eventMessaging.js'
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

    // A tenant who has not accepted yet can be invited again (lost link, expired link). One who has an
    // active account cannot.
    let tenantUser = null
    if (tenant.user) {
      tenantUser = await User.findById(tenant.user)
      if (tenantUser && tenantUser.status !== 'INVITED') {
        throw createError(
          'This tenant already has an account.',
          409
        )
      }
    }

    // Another account must not already use this phone or e-mail. Only look for an e-mail when there is one:
    // matching "email: null" would hit every account without an e-mail.
    const identity = [{ phone: tenant.phone }]
    if (tenant.email) identity.push({ email: tenant.email })

    const clash = await User.findOne({
      $or: identity,
      ...(tenantUser ? { _id: { $ne: tenantUser._id } } : {}),
    })

    if (clash) {
      throw createError(
        'An account already exists with this phone number or e-mail.',
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
          3 * 24 * 60 * 60 * 1000
      )

    // --------------------------------------------------
    // CREATE TENANT USER
    // --------------------------------------------------

    if (!tenantUser) {
      tenantUser = await User.create({
        name: tenant.name,
        phone: tenant.phone,
        ...(tenant.email ? { email: tenant.email } : {}),
        role: 'TENANT',
        organization: tenant.organization,
        status: 'INVITED',
        passwordHash: null,
      })

      // Link Tenant → User
      tenant.user = tenantUser._id
      await tenant.save()
    }

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
          tenant.email || null,

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

    const tenantProperty = await Property.findById(tenant.property).select('name').lean()
    await sendInvitationMessage({ organization: user.organization, property: tenant.property, propertyName: tenantProperty?.name, inviterName: user.name, name: tenant.name, role: 'a resident', link: invitationUrl, phone: tenant.phone, email: tenant.email })

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

  export const forgotPassword =
  async ({ email }) => {

    const user =
      await User.findOne({
        email,
        status: 'ACTIVE',
      })

    if (!user) {
      return
    }

    // Cancel previous reset tokens
    await PasswordResetToken.updateMany(
      {
        user: user._id,
        usedAt: null,
      },
      {
        $set: {
          usedAt: new Date(),
        },
      }
    )

    const rawToken =
      crypto
        .randomBytes(32)
        .toString('hex')

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex')

    const expiresAt =
      new Date(
        Date.now() +
          15 * 60 * 1000
      )

    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
    })

    const frontendUrl =
      process.env.FRONTEND_URL

    const resetUrl =
      `${frontendUrl}/reset-password?token=${rawToken}`

    // Send email here
    // await sendPasswordResetEmail(...)

    return {
      resetUrl,
    }
  }

  export const resetPassword =
  async ({
    token,
    password,
  }) => {

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')

    const resetToken =
      await PasswordResetToken.findOne({
        tokenHash,
        usedAt: null,
      })

    if (!resetToken) {
      throw createError(
        'Invalid or expired password reset link.',
        400
      )
    }

    if (
      resetToken.expiresAt <
      new Date()
    ) {
      throw createError(
        'Invalid or expired password reset link.',
        400
      )
    }

    const user =
      await User.findOne({
        _id: resetToken.user,
        status: 'ACTIVE',
      }).select('+passwordHash')

    if (!user) {
      throw createError(
        'Account is no longer available.',
        404
      )
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      )

    user.passwordHash =
      passwordHash

    await user.save()

    resetToken.usedAt =
      new Date()

    await resetToken.save()

    return {
      success: true,
    }
  }
  