import mongoose from 'mongoose'

export const PASS_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']
export const PASS_SOURCES = ['GATE_QR', 'RESIDENT', 'STAFF']

// One visit by one guest to one resident. The resident approves it; the gate checks the guest in and out.
const guestPassSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    // Empty when a visitor typed a number that matches no resident. Such a request stays unanswered and
    // expires, so the public form never reveals who lives here.
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    visitorName: { type: String, required: true, trim: true, maxlength: 80 },
    visitorPhone: { type: String, required: true, trim: true, maxlength: 20 },
    relation: { type: String, trim: true, maxlength: 40, default: '' },
    purpose: { type: String, trim: true, maxlength: 200, default: '' },
    guests: { type: Number, min: 1, max: 5, default: 1 },
    // Calendar day in India, "YYYY-MM-DD". Kept as text so server time zones cannot shift it.
    visitDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    expectedTime: { type: String, trim: true, maxlength: 20, default: '' },
    status: { type: String, enum: PASS_STATUSES, default: 'PENDING' },
    source: { type: String, enum: PASS_SOURCES, required: true },
    // Six digits the guest shows at the gate. Given only after the resident approves.
    code: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decidedVia: { type: String, enum: ['APP', 'LINK', 'INVITE', null], default: null },
    rejectReason: { type: String, trim: true, maxlength: 200, default: null },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkedOutAt: { type: Date, default: null },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['RESIDENT', 'STAFF', null], default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

guestPassSchema.index({ organization: 1, property: 1, visitDate: -1 })
guestPassSchema.index({ property: 1, visitDate: 1, code: 1 })

export default mongoose.models.GuestPass || mongoose.model('GuestPass', guestPassSchema)
