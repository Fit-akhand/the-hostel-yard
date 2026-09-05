import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    passwordHash: {
      type: String,
      select: false,
    },

    role: {
      type: String,
      enum: [
        'BUSINESS_OWNER',
        'LANDLORD',
        'PROPERTY_MANAGER',
        'STAFF',
        'TENANT',
      ],
      required: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        'INVITED',
        'PENDING_VERIFICATION',
        'ACTIVE',
        'SUSPENDED',
        'DEACTIVATED',
      ],
      default: 'PENDING_VERIFICATION',
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', userSchema)

export default User