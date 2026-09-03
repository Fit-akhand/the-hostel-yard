import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema(
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

    category: {
      type: String,
      enum: [
        'ELECTRICITY',
        'WATER',
        'INTERNET',
        'FOOD',
        'MAINTENANCE',
        'SALARY',
        'CLEANING',
        'SUPPLIES',
        'TAX',
        'MARKETING',
        'OTHER',
      ],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentMethod: {
      type: String,
      enum: [
        'CASH',
        'UPI',
        'BANK_TRANSFER',
        'CARD',
        'OTHER',
      ],
      required: true,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    receiptUrl: {
      type: String,
      trim: true,
      default: null,
    },

    receiptPublicId: {
      type: String,
      trim: true,
      default: null,
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'VOIDED',
      ],
      default: 'ACTIVE',
      index: true,
    },

    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    voidedAt: {
      type: Date,
      default: null,
    },

    voidReason: {
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

expenseSchema.index({
  organization: 1,
  property: 1,
  expenseDate: -1,
})

expenseSchema.index({
  property: 1,
  category: 1,
  status: 1,
})

const Expense = mongoose.model(
  'Expense',
  expenseSchema
)

export default Expense