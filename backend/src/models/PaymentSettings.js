import mongoose from 'mongoose'

const paymentSettingsSchema = new mongoose.Schema(
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
    },

    upiId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    accountName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    qrImageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    qrImagePublicId: {
      type: String,
      trim: true,
      default: null,
    },

    paymentInstructions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: 'Scan the QR and pay your rent.',
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

paymentSettingsSchema.index(
  {
    property: 1,
  },
  {
    unique: true,
  }
)

paymentSettingsSchema.index({
  organization: 1,
  property: 1,
})

const PaymentSettings = mongoose.model(
  'PaymentSettings',
  paymentSettingsSchema
)

export default PaymentSettings