import mongoose from 'mongoose'

// A private link that lets a resident fill in their resident form and sign documents without an app
// account. Only a hash of the token is stored; creating a new link switches off the old one.
const tenantLinkSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastOpenedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.TenantLink || mongoose.model('TenantLink', tenantLinkSchema)
