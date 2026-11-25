import mongoose from 'mongoose'

// Money rules for one organisation: the late fee on overdue rent and the move-out notice period.
const financeSettingsSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    lateFee: {
      enabled: { type: Boolean, default: false },
      // FLAT: one fixed fee. PER_DAY: fee for each late day after the grace days. PERCENT: % of the rent, once.
      mode: { type: String, enum: ['FLAT', 'PER_DAY', 'PERCENT'], default: 'FLAT' },
      amount: { type: Number, default: 100, min: 0 },
      graceDays: { type: Number, default: 3, min: 0, max: 30 },
      maxAmount: { type: Number, default: null, min: 0 },
    },
    // Days of notice a resident must give before moving out.
    noticePeriodDays: { type: Number, default: 30, min: 0, max: 120 },
  },
  { timestamps: true }
)

export const DEFAULT_FINANCE_SETTINGS = new mongoose.Document({}, financeSettingsSchema).toObject()

export default mongoose.model('FinanceSettings', financeSettingsSchema)
