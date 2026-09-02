import mongoose from 'mongoose'

const tenantSchema = new mongoose.Schema(
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

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
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

    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: true,
    },

    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: null,
      },

      phone: {
        type: String,
        trim: true,
        default: null,
      },

      relationship: {
        type: String,
        trim: true,
        default: null,
      },
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    moveInDate: {
      type: Date,
      required: true,
    },

    noticeDate: {
      type: Date,
      default: null,
    },

    expectedMoveOutDate: {
      type: Date,
      default: null,
    },

    actualMoveOutDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'NOTICE_PERIOD',
        'LEFT',
      ],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
)

tenantSchema.index({
  organization: 1,
  property: 1,
})

tenantSchema.index({
  property: 1,
  phone: 1,
})

const Tenant = mongoose.model(
  'Tenant',
  tenantSchema
)

export default Tenant