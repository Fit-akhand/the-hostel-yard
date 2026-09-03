import mongoose from 'mongoose'

const staffInvitationSchema =
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
      },

      staffName: {
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

      designation: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      permissions: [
        {
          type: String,
          required: true,
        },
      ],

      joiningDate: {
        type: Date,
        default: null,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },

      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      invitationTokenHash: {
        type: String,
        required: true,
        unique: true,
      },

      status: {
        type: String,
        enum: [
          'PENDING',
          'ACTIVATED',
          'EXPIRED',
        ],
        default: 'PENDING',
        index: true,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
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

staffInvitationSchema.index({
  organization: 1,
  property: 1,
  phone: 1,
  status: 1,
})

const StaffInvitation =
  mongoose.model(
    'StaffInvitation',
    staffInvitationSchema
  )

export default StaffInvitation