import bcrypt from 'bcryptjs'

import User from '../models/User.js'
import Organization from '../models/Organization.js'
import SetupVerification from '../models/SetupVerification.js'
import { generateAccessToken } from '../utils/token.js'

import { createOtp, verifyOtp } from './otpService.js'

import crypto from 'crypto'
import PasswordResetToken from '../models/PasswordResetToken.js'
const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export const forgotPassword = async ({
  email,
}) => {
  const normalizedEmail =
    email.trim().toLowerCase()

  const user = await User.findOne({
    email: normalizedEmail,
  })

  // Security:
  // Never reveal whether an account exists.
  if (!user) {
    return
  }

  // Invalidate previous reset tokens
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
    crypto.randomBytes(32).toString('hex')

  const tokenHash =
    crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex')

  const expiresAt =
    new Date(
      Date.now() + 15 * 60 * 1000
    )

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
  })

  const frontendUrl =
    process.env.FRONTEND_URL ||
    'http://localhost:5173'

  const resetUrl =
    `${frontendUrl}/reset-password?token=${rawToken}`

  // TODO:
  // Send resetUrl using your email service.
  //
  // await sendPasswordResetEmail({
  //   email: user.email,
  //   name: user.name,
  //   resetUrl,
  // })

  // DO NOT return resetUrl in production.
  return {
  resetUrl,
  expiresAt,
}
}

export const resetPassword = async ({
  token,
  password,
}) => {
  if (!token) {
    throw createError(
      'Password reset token is required.',
      400
    )
  }

  // Hash the raw token received from frontend
  const tokenHash =
    crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')

  // Find valid, unused token
  const resetToken =
    await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    })

  if (!resetToken) {
    throw createError(
      'Invalid or expired password reset token.',
      400
    )
  }

  // Find user
  const user =
    await User.findById(
      resetToken.user
    ).select('+passwordHash')

  if (!user) {
    throw createError(
      'Account not found.',
      404
    )
  }

  // Suspended/deactivated users cannot reset
  if (
    user.status === 'SUSPENDED' ||
    user.status === 'DEACTIVATED'
  ) {
    throw createError(
      'This account cannot reset its password.',
      403
    )
  }

  // Hash new password
  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )

  user.passwordHash =
    passwordHash

  // Invalidate all existing JWTs
  user.tokenVersion += 1

  // IMPORTANT:
  // If an invited user somehow uses forgot-password,
  // this activates the account.
  if (
    user.status === 'INVITED'
  ) {
    user.status = 'ACTIVE'
  }

  await user.save()

  // Mark current reset token as used
  resetToken.usedAt =
    new Date()

  await resetToken.save()

  // Invalidate any other active reset tokens
  await PasswordResetToken.updateMany(
    {
      user: user._id,
      _id: {
        $ne: resetToken._id,
      },
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    }
  )
}

export const setupBusinessOwner = async ({
  name,
  phone,
  email,
  password,
  organizationName,
}) => {
  const existingOwner = await User.findOne({
    role: 'BUSINESS_OWNER',
  })

  if (existingOwner) {
    const error = new Error(
      'Business Owner setup has already been completed.'
    )

    error.statusCode = 409

    throw error
  }

  const existingPhone = await User.findOne({ phone })

  if (existingPhone) {
    const error = new Error(
      'An account with this phone number already exists.'
    )

    error.statusCode = 409

    throw error
  }

  const existingEmail = await User.findOne({ email })

  if (existingEmail) {
    const error = new Error(
      'An account with this email already exists.'
    )

    error.statusCode = 409

    throw error
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const otpIdentifier = phone.trim().toLowerCase()

  await SetupVerification.deleteMany({
    otpIdentifier,
  })

  const setupVerification = await SetupVerification.create({
    name,
    phone,
    email,
    passwordHash,
    organizationName,
    otpIdentifier,
    expiresAt: new Date(
      Date.now() + 10 * 60 * 1000
    ),
  })

  try {
    await createOtp({
      identifier: otpIdentifier,
      purpose: 'SETUP_OWNER',
    })
  } catch (error) {
    await SetupVerification.deleteOne({
      _id: setupVerification._id,
    })

    throw error
  }

  return {
    verificationId: setupVerification._id,
    message: 'OTP sent successfully.',
    expiresIn: 300,
  }
}
export const verifyBusinessOwnerSetup = async ({
  verificationId,
  otp,
}) => {
  const setupVerification =
    await SetupVerification.findById(
      verificationId
    )

  if (!setupVerification) {
    const error = new Error(
      'Setup verification has expired or does not exist.'
    )

    error.statusCode = 400

    throw error
  }

  if (
    setupVerification.expiresAt < new Date()
  ) {
    await SetupVerification.deleteOne({
      _id: setupVerification._id,
    })

    const error = new Error(
      'Setup verification has expired.'
    )

    error.statusCode = 400

    throw error
  }

  await verifyOtp({
    identifier: setupVerification.otpIdentifier,
    purpose: 'SETUP_OWNER',
    otp,
  })

  const existingOwner = await User.findOne({
    role: 'BUSINESS_OWNER',
  })

  if (existingOwner) {
    await SetupVerification.deleteOne({
      _id: setupVerification._id,
    })

    const error = new Error(
      'Business Owner setup has already been completed.'
    )

    error.statusCode = 409

    throw error
  }

  const user = await User.create({
    name: setupVerification.name,
    phone: setupVerification.phone,
    email: setupVerification.email,
    passwordHash: setupVerification.passwordHash,
    role: 'BUSINESS_OWNER',
    isPhoneVerified: true,
    status: 'ACTIVE',
  })

  const organization = await Organization.create({
    name: setupVerification.organizationName,
    owner: user._id,
    phone: user.phone,
    email: user.email,
  })

  user.organization = organization._id

  await user.save()

  await SetupVerification.deleteOne({
    _id: setupVerification._id,
  })

  return {
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      organization: organization._id,
    },

    organization: {
      id: organization._id,
      name: organization.name,
    },
  }
}
export const loginUser = async ({
  identifier,
  password,
}) => {
  const normalizedIdentifier = identifier
    .trim()
    .toLowerCase()

  const user = await User.findOne({
    $or: [
      { email: normalizedIdentifier },
      { phone: normalizedIdentifier },
    ],
  }).select('+passwordHash')

  if (!user || !user.passwordHash) {
    const error = new Error(
      'Invalid credentials.'
    )

    error.statusCode = 401

    throw error
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error(
      'Your account is not active.'
    )

    error.statusCode = 403

    throw error
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  )

  if (!passwordMatches) {
    const error = new Error(
      'Invalid credentials.'
    )

    error.statusCode = 401

    throw error
  }

  user.lastLoginAt = new Date()

  await user.save()

  const accessToken = generateAccessToken(user)

  return {
    accessToken,

    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      organization: user.organization,
    },
  }
}