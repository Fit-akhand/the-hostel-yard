import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    type: {
      type: String,
      enum: [
        'PG',
        'HOSTEL',
        'HOTEL',
        'FLAT',
        'OTHER',
      ],
      required: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    // Printed as a QR code at the gate: visitors open it to ask a resident for a guest pass.
    visitorCode: {
      type: String,
      trim: true,
      maxlength: 20,
      default: undefined,
      index: { unique: true, sparse: true },
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
)

const Property = mongoose.model(
  'Property',
  propertySchema
)

export default Property