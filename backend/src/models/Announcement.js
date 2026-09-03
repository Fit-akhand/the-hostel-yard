import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    type: {
      type: String,
      enum: [
        'GENERAL',
        'MAINTENANCE',
        'PAYMENT',
        'FOOD',
        'RULES',
        'EMERGENCY',
        'EVENT',
        'OTHER',
      ],
      default: 'GENERAL',
      index: true,
    },

    priority: {
      type: String,
      enum: [
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT',
      ],
      default: 'MEDIUM',
      index: true,
    },

    audience: {
      type: String,
      enum: [
        'ALL_TENANTS',
        'PROPERTY_TENANTS',
        'SPECIFIC_TENANT',
        'STAFF',
        'MANAGERS',
      ],
      required: true,
      index: true,
    },

    targetTenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'PUBLISHED',
        'EXPIRED',
        'CANCELLED',
      ],
      default: 'DRAFT',
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

announcementSchema.index({
  organization: 1,
  property: 1,
  status: 1,
})

announcementSchema.index({
  organization: 1,
  property: 1,
  audience: 1,
})

announcementSchema.index({
  organization: 1,
  targetTenant: 1,
  status: 1,
})

const Announcement = mongoose.model(
  'Announcement',
  announcementSchema
)

export default Announcement