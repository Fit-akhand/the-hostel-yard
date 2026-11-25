import mongoose from 'mongoose'

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    legalName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    logo: {
      type: String,
      default: null,
    },

    // Address of the public vacancy page, e.g. /pg/the-hostel-yard. Set the first time a property is listed.
    publicSlug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 60,
      default: undefined,
      index: { unique: true, sparse: true },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    city: {
      type: String,
      trim: true,
      default: null,
    },

    state: {
      type: String,
      trim: true,
      default: null,
    },

    pincode: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const Organization = mongoose.model(
  'Organization',
  organizationSchema
)

export default Organization