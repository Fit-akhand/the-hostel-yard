import mongoose from 'mongoose'

// One salary calculation for one employee and one month. DRAFT can be recalculated, PAID is final.
const payrollSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true }, // YYYY-MM

    payType: { type: String, enum: ['MONTHLY', 'DAILY'], required: true },
    baseSalary: { type: Number, required: true },
    daysInMonth: { type: Number, required: true },

    presentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    paidLeaves: { type: Number, default: 0 },
    weeklyOffs: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    payableDays: { type: Number, default: 0 },

    grossPay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    advanceRecovered: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    status: { type: String, enum: ['DRAFT', 'PAID'], default: 'DRAFT', index: true },
    paidOn: { type: String, default: null }, // YYYY-MM-DD
    paymentMethod: { type: String, enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'], default: null },
    reference: { type: String, trim: true, maxlength: 100, default: null },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

payrollSchema.index({ employee: 1, month: 1 }, { unique: true })
payrollSchema.index({ organization: 1, month: 1 })

export default mongoose.model('Payroll', payrollSchema)
