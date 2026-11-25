import mongoose from 'mongoose'

export const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']

// How one property appears on the public vacancy page. Nothing is public until `published` is true.
const propertyListingSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
    published: { type: Boolean, default: false },
    slug: { type: String, trim: true, lowercase: true, maxlength: 60, required: true },
    audience: { type: String, enum: ['BOYS', 'GIRLS', 'ANY'], default: 'ANY' },
    headline: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    amenities: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    // Starting monthly rent shown per room type; 0 or empty hides the price for that type.
    rentFrom: {
      SINGLE: { type: Number, min: 0, default: null },
      DOUBLE: { type: Number, min: 0, default: null },
      TRIPLE: { type: Number, min: 0, default: null },
      DORMITORY: { type: Number, min: 0, default: null },
    },
    contactPhone: { type: String, trim: true, maxlength: 20, default: '' },
    showFoodMenu: { type: Boolean, default: true },
    mapUrl: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
)

propertyListingSchema.index({ organization: 1, slug: 1 }, { unique: true })

export default mongoose.models.PropertyListing || mongoose.model('PropertyListing', propertyListingSchema)
