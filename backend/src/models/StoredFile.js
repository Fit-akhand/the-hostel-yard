import mongoose from 'mongoose'

// Private files kept in the database when Cloudinary is not configured (for example on a fresh local
// setup). Only reachable through the signed-in KYC routes.
const storedFileSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    data: { type: Buffer, required: true },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.StoredFile || mongoose.model('StoredFile', storedFileSchema)
