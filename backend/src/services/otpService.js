import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import OTPVerification from '../models/OTPVerification.js'

const OTP_EXPIRY_MINUTES = 5
const MAX_OTP_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 60

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString()
}

const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10)
}

const sendDevelopmentOtp = (identifier, otp) => {
  console.log('----------------------------------------')
  console.log('THE HOSTEL YARD - DEVELOPMENT OTP')
  console.log(`Identifier: ${identifier}`)
  console.log(`OTP: ${otp}`)
  console.log(`Expires in: ${OTP_EXPIRY_MINUTES} minutes`)
  console.log('----------------------------------------')
}

export const createOtp = async ({
  identifier,
  purpose,
}) => {
  const normalizedIdentifier = identifier.trim().toLowerCase()

  const recentOtp = await OTPVerification.findOne({
    identifier: normalizedIdentifier,
    purpose,
    createdAt: {
      $gte: new Date(
        Date.now() - RESEND_COOLDOWN_SECONDS * 1000
      ),
    },
  })

  if (recentOtp) {
    const error = new Error(
      `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP.`
    )

    error.statusCode = 429

    throw error
  }

  // Remove older OTPs for this identifier and purpose
  await OTPVerification.deleteMany({
    identifier: normalizedIdentifier,
    purpose,
  })

  const otp = generateOtp()
  const otpHash = await hashOtp(otp)

  const expiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  )

  await OTPVerification.create({
    identifier: normalizedIdentifier,
    otpHash,
    purpose,
    expiresAt,
  })

  // Development only.
  // Later this will call the real SMS provider.
  sendDevelopmentOtp(normalizedIdentifier, otp)

  return {
    expiresIn: OTP_EXPIRY_MINUTES * 60,
  }
}

export const verifyOtp = async ({
  identifier,
  purpose,
  otp,
}) => {
  const normalizedIdentifier = identifier.trim().toLowerCase()

  const otpRecord = await OTPVerification.findOne({
    identifier: normalizedIdentifier,
    purpose,
    verified: false,
  }).sort({
    createdAt: -1,
  })

  if (!otpRecord) {
    const error = new Error('OTP not found or already used.')
    error.statusCode = 400
    throw error
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTPVerification.deleteOne({
      _id: otpRecord._id,
    })

    const error = new Error('OTP has expired.')
    error.statusCode = 400
    throw error
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    const error = new Error(
      'Too many incorrect OTP attempts.'
    )

    error.statusCode = 429

    throw error
  }

  const isValidOtp = await bcrypt.compare(
    otp,
    otpRecord.otpHash
  )

  if (!isValidOtp) {
    otpRecord.attempts += 1

    await otpRecord.save()

    const error = new Error('Invalid OTP.')
    error.statusCode = 400
    throw error
  }

  otpRecord.verified = true

  await otpRecord.save()

  return {
    verified: true,
  }
}