import mongoose from 'mongoose'

// The security deposit a tenant paid when moving in, and what happened to it when they left.
const depositSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

    amount: { type: Number, required: true, min: 1 },
    receivedOn: { type: String, required: true }, // YYYY-MM-DD
    method: { type: String, enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'], default: 'CASH' },
    notes: { type: String, trim: true, maxlength: 300, default: null },

    status: { type: String, enum: ['HELD', 'SETTLED'], default: 'HELD', index: true },

    // Filled in when the tenant leaves.
    settlement: {
      settledOn: { type: String, default: null },
      rentAdjusted: { type: Number, default: 0 },
      deductions: [{ reason: { type: String, trim: true, maxlength: 200 }, amount: { type: Number, min: 1 } }],
      deductionsTotal: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      refundMethod: { type: String, enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'], default: null },
      stillOwed: { type: Number, default: 0 },
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('Deposit', depositSchema)
