import mongoose from 'mongoose'

const allocationSchema = new mongoose.Schema(
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
      enum: [
        'ACTIVE',
        'ENDED',
      ],
      default: 'ACTIVE',
      index: true,
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

allocationSchema.index({
  organization: 1,
  tenant: 1,
  status: 1,
})

allocationSchema.index({
  organization: 1,
  bed: 1,
  status: 1,
})

allocationSchema.index({
  property: 1,
  status: 1,
})

const Allocation = mongoose.model(
  'Allocation',
  allocationSchema
)

export default Allocation