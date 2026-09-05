import mongoose from 'mongoose'

const tenantInvitationSchema =
  new mongoose.Schema(
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

      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
      },

      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
      },

      tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },

      status: {
        type: String,
        enum: [
          'PENDING',
          'ACCEPTED',
          'EXPIRED',
          'CANCELLED',
        ],
        default: 'PENDING',
        index: true,
      },

      acceptedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  )

  tenantInvitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

const TenantInvitation =
  mongoose.model(
    'TenantInvitation',
    tenantInvitationSchema
  )

export default TenantInvitation