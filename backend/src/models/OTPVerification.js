import mongoose from 'mongoose'

const otpVerificationSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: [
        'SETUP_OWNER',
        'LOGIN',
        'PHONE_VERIFICATION',
        'PASSWORD_RESET',
        'INVITATION',
      ],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

otpVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

const OTPVerification = mongoose.model(
  'OTPVerification',
  otpVerificationSchema
)

export default OTPVerification