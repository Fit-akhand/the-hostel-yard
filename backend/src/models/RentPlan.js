import mongoose from 'mongoose'

const rentPlanSchema = new mongoose.Schema(
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
      ref: 'Allocation',
      required: true,
      index: true,
    },

    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
      default: 5,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
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

rentPlanSchema.index({
  organization: 1,
  tenant: 1,
  status: 1,
})

rentPlanSchema.index({
  organization: 1,
  property: 1,
})

const RentPlan = mongoose.model(
  'RentPlan',
  rentPlanSchema
)

export default RentPlan