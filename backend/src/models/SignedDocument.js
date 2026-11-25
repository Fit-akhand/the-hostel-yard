import mongoose from 'mongoose'

export const DOCUMENT_KINDS = ['AGREEMENT', 'RESIDENT_FORM']
export const DOCUMENT_STATUSES = ['DRAFT', 'SENT', 'TENANT_SIGNED', 'COMPLETED', 'CANCELLED']

const signatureSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['TENANT', 'OWNER'], required: true },
    name: { type: String, trim: true, maxlength: 100, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // The drawn signature as a PNG data URL.
    image: { type: String, maxlength: 200000, required: true },
    signedAt: { type: Date, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, maxlength: 400, default: null },
    // How the signer proved who they were: signed in to the app, opened their private link, or a code sent to their phone.
    verifiedBy: { type: String, enum: ['LOGIN', 'LINK', 'OTP'], required: true },
    phoneLast4: { type: String, default: null },
    consent: { type: String, maxlength: 500, required: true },
    // Fingerprint of the exact text that was signed.
    documentHash: { type: String, required: true },
  },
  { _id: false }
)

// One document a resident signs: the licence agreement or the resident form. The text is frozen when the
// document is created, so later template edits never change what someone signed.
const signedDocumentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    title: { type: String, trim: true, maxlength: 150, required: true },
    body: { type: String, maxlength: 80000, required: true },
    // Terms of an agreement, or the form answers of a resident form, as they were when it was made.
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    hash: { type: String, required: true },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'DRAFT', index: true },
    requiresCountersign: { type: Boolean, default: true },
    signatures: { type: [signatureSchema], default: [] },
    sentAt: { type: Date, default: null },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelReason: { type: String, trim: true, maxlength: 300, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

signedDocumentSchema.index({ organization: 1, kind: 1, status: 1 })

export default mongoose.models.SignedDocument || mongoose.model('SignedDocument', signedDocumentSchema)
