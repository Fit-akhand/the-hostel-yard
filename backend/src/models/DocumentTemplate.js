import mongoose from 'mongoose'

export const TEMPLATE_KINDS = ['AGREEMENT', 'RESIDENT_DECLARATION']

// The owner's own wording for the licence agreement and for the house rules a resident accepts in the
// resident form. {{placeholders}} are filled in when a document is created.
const documentTemplateSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    kind: { type: String, enum: TEMPLATE_KINDS, required: true },
    title: { type: String, trim: true, maxlength: 150, required: true },
    body: { type: String, maxlength: 60000, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

documentTemplateSchema.index({ organization: 1, kind: 1 }, { unique: true })

export default mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', documentTemplateSchema)
