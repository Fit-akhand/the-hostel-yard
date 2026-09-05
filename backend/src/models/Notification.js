import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'TENANT_INVITATION',

        'PAYMENT_RECEIVED',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED',

        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',

        'COMPLAINT_CREATED',
        'COMPLAINT_ASSIGNED',
        'COMPLAINT_STATUS_CHANGED',

        'ANNOUNCEMENT',

        'GENERAL',
      ],
      default: 'GENERAL',
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
      maxlength: 1000,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Main notification feed
notificationSchema.index({
  recipient: 1,
  organization: 1,
  createdAt: -1,
})

// Fast unread count
notificationSchema.index({
  recipient: 1,
  organization: 1,
  isRead: 1,
})

// Property notification filtering
notificationSchema.index({
  organization: 1,
  property: 1,
  recipient: 1,
  createdAt: -1,
})

const Notification =
  mongoose.models.Notification ||
  mongoose.model(
    'Notification',
    notificationSchema
  )

export default Notification