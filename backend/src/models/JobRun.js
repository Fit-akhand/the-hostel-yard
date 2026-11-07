import mongoose from 'mongoose'

const jobRunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export default mongoose.model('JobRun', jobRunSchema)
