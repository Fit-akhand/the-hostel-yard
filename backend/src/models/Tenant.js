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

    // Left out entirely until the tenant accepts an invitation. It must never be stored as null: a unique
    // index treats null as a value, so a second tenant without an account would be rejected.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
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

// One account per tenant, checked only for tenants that have one.
tenantSchema.index(
  { user: 1 },
  {
    unique: true,
    name: 'user_linked_unique',
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
)

const Tenant = mongoose.model(
  'Tenant',
  tenantSchema
)

export default Tenant