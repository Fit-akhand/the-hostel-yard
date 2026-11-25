import mongoose from 'mongoose'

// One document per limited key (for example "login-ip:1.2.3.4"). MongoDB removes it once resetAt has
// passed, so the collection stays small. Kept in the database (not memory) because on Vercel every
// request can land on a different server instance.
const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
)

rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema)
