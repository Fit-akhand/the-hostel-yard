import mongoose from 'mongoose'

const rentDueSchema = new mongoose.Schema(
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

    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedAllocation',
      required: true,
      index: true,
    },

    rentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentPlan',
      required: true,
      index: true,
    },

    billingMonth: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'PARTIAL',
        'PAID',
        'OVERDUE',
        'CANCELLED',
      ],
      default: 'PENDING',
    },

    notes: {
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

rentDueSchema.index(
  {
    organization: 1,
    tenant: 1,
    billingMonth: 1,
  },
  {
    unique: true,
  }
)

rentDueSchema.index({
  organization: 1,
  property: 1,
  status: 1,
})

rentDueSchema.index({
  tenant: 1,
  dueDate: 1,
})

const RentDue = mongoose.model(
  'RentDue',
  rentDueSchema
)

export default RentDue