import mongoose from 'mongoose'

// Every message the system tried to send outside the app, kept for history and to avoid duplicates.
const messageLogSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, required: true },
    channel: { type: String, enum: ['WHATSAPP', 'SMS', 'EMAIL'], required: true },
    to: { type: String, default: null },
    body: { type: String, required: true },

    status: { type: String, enum: ['SENT', 'FAILED', 'SKIPPED'], required: true },
    providerId: { type: String, default: null },
    error: { type: String, default: null },

    // "<event>:<channel>" - a second send with the same key is ignored.
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true }
)

messageLogSchema.index({ organization: 1, createdAt: -1 })
messageLogSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } })

export default mongoose.model('MessageLog', messageLogSchema)
