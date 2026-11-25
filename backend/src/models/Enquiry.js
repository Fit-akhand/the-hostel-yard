import mongoose from 'mongoose'

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CONVERTED', 'LOST']
export const ENQUIRY_SOURCES = ['WEBSITE', 'WALK_IN', 'PHONE', 'WHATSAPP', 'REFERRAL', 'OTHER']

// Someone asking about a bed: from the public vacancy page or added by hand after a call or visit.
const enquirySchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: null },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', null], default: null },
    sharing: { type: String, enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'ANY', null], default: null },
    moveInDate: { type: Date, default: null },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    source: { type: String, enum: ENQUIRY_SOURCES, default: 'WEBSITE' },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'NEW', index: true },
    followUpOn: { type: Date, default: null },
    visitOn: { type: Date, default: null },
    lostReason: { type: String, trim: true, maxlength: 200, default: null },
    notes: [
      {
        text: { type: String, trim: true, maxlength: 1000, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        byName: { type: String, default: null },
        at: { type: Date, default: Date.now },
      },
    ],
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

enquirySchema.index({ organization: 1, status: 1, createdAt: -1 })

export default mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema)
