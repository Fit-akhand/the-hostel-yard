import mongoose from 'mongoose'

// Running numbers per organisation and year, e.g. receipts: THY-2026-000001.
const counterSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
})
counterSchema.index({ organization: 1, key: 1 }, { unique: true })

export default mongoose.model('Counter', counterSchema)
