import mongoose from 'mongoose'

// Money that changes a salary: advances (recovered later), deductions (fines, damages) and bonuses.
const adjustmentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    type: { type: String, enum: ['ADVANCE', 'DEDUCTION', 'BONUS'], required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, maxlength: 200, default: null },

    date: { type: String, required: true }, // YYYY-MM-DD it was given / happened
    month: { type: String, required: true }, // YYYY-MM payroll it first applies to

    // ADVANCE only: how much has been taken back from salaries so far.
    recoveredAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['OPEN', 'APPLIED'], default: 'OPEN', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

adjustmentSchema.index({ employee: 1, month: 1 })

export default mongoose.model('PayrollAdjustment', adjustmentSchema)
