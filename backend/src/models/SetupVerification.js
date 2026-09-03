import mongoose from 'mongoose'

const setupVerificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

    otpIdentifier: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

setupVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

const SetupVerification = mongoose.model(
  'SetupVerification',
  setupVerificationSchema
)

export default SetupVerification