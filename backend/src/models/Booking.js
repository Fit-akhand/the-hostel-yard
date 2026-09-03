import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
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

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },

    bed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
      index: true,
    },

    bookingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expectedMoveInDate: {
      type: Date,
      required: true,
    },

    expectedMoveOutDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'CANCELLED',
        'EXPIRED',
        'COMPLETED',
      ],
      default: 'PENDING',
      index: true,
    },

    amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIAL', 'PAID'],
      default: 'UNPAID',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

bookingSchema.index({
  organization: 1,
  property: 1,
  status: 1,
})

bookingSchema.index({
  organization: 1,
  tenant: 1,
  status: 1,
})

bookingSchema.index({
  organization: 1,
  bed: 1,
  status: 1,
})

bookingSchema.index({
  organization: 1,
  expectedMoveInDate: 1,
})

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking