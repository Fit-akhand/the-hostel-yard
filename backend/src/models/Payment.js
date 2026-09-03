import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
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

    rentDue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentDue',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    method: {
      type: String,
      enum: ['CASH', 'UPI'],
      required: true,
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'VERIFIED',
        'REJECTED',
      ],
      default: 'PENDING',
      index: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

  },
  {
    timestamps: true,
  }
)

paymentSchema.index({
  organization: 1,
  property: 1,
  tenant: 1,
})

paymentSchema.index({
  rentDue: 1,
  status: 1,
})

const Payment = mongoose.model(
  'Payment',
  paymentSchema
)

export default Payment