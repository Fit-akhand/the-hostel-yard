import mongoose from 'mongoose'

export const MENU_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
export const MENU_MEALS = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER']

// The weekly menu of one property. It repeats every week until someone edits it.
const foodMenuSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
    meals: {
      type: [{ type: String, enum: MENU_MEALS }],
      default: () => [...MENU_MEALS],
    },
    // e.g. { BREAKFAST: '7:30 - 9:30 AM' }
    timings: {
      BREAKFAST: { type: String, trim: true, maxlength: 40, default: '' },
      LUNCH: { type: String, trim: true, maxlength: 40, default: '' },
      SNACKS: { type: String, trim: true, maxlength: 40, default: '' },
      DINNER: { type: String, trim: true, maxlength: 40, default: '' },
    },
    entries: [
      {
        _id: false,
        day: { type: String, enum: MENU_DAYS, required: true },
        meal: { type: String, enum: MENU_MEALS, required: true },
        items: { type: String, trim: true, maxlength: 200, default: '' },
      },
    ],
    note: { type: String, trim: true, maxlength: 300, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.FoodMenu || mongoose.model('FoodMenu', foodMenuSchema)
