import mongoose from 'mongoose'

const managerInvitationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    managerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    permissions: [
      {
        type: String,
        required: true,
      },
    ],

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    invitationTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'ACTIVATED',
        'EXPIRED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    activatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

managerInvitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

const ManagerInvitation =
  mongoose.model(
    'ManagerInvitation',
    managerInvitationSchema
  )

export default ManagerInvitation