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

export const forgotPassword = async ({
  email,
}) => {
  const user = await User.findOne({
    email: email.toLowerCase(),
  })

  // Do not reveal whether account exists.
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

  // Generate secure token
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
  // Send resetUrl through your email service.
  //
  // await sendPasswordResetEmail({
  //   email: user.email,
  //   name: user.name,
  //   resetUrl,
  // })

  return
}