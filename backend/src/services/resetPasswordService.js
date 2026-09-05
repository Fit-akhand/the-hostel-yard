import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import User from '../models/User.js'
import PasswordResetToken from '../models/PasswordResetToken.js'

const createError = (
  message,
  statusCode
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export const resetPassword = async ({
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
  // FIND VALID RESET TOKEN
  // --------------------------------------------------

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
      'Invalid or expired password reset link.',
      400
    )
  }

  // --------------------------------------------------
  // FIND USER
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ACCOUNT STATUS
  // --------------------------------------------------

  if (
    user.status === 'SUSPENDED' ||
    user.status === 'DEACTIVATED'
  ) {
    throw createError(
      'This account cannot reset its password.',
      403
    )
  }

  // --------------------------------------------------
  // HASH NEW PASSWORD
  // --------------------------------------------------

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )

  user.passwordHash =
    passwordHash

  // --------------------------------------------------
  // INVALIDATE EXISTING LOGIN TOKENS
  // --------------------------------------------------

  user.tokenVersion += 1

  // IMPORTANT:
  // Do not blindly change account status.
  // An ACTIVE tenant remains ACTIVE.
  // --------------------------------------------------

  await user.save()

  // --------------------------------------------------
  // MARK CURRENT RESET TOKEN AS USED
  // --------------------------------------------------

  resetToken.usedAt =
    new Date()

  await resetToken.save()

  // --------------------------------------------------
  // INVALIDATE ALL OTHER RESET TOKENS
  // --------------------------------------------------

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