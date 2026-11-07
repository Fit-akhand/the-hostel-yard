import mongoose from 'mongoose'

// A person on the payroll (cook, guard, cleaner, warden...). Most of them never log in to the app,
// so this is separate from User/StaffAssignment. `user` can link an employee to an app account.
const employeeSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, trim: true, default: null },
    designation: { type: String, required: true, trim: true, maxlength: 60 },

    // MONTHLY: `salary` is the monthly amount. DAILY: `salary` is the rate per day worked.
    payType: { type: String, enum: ['MONTHLY', 'DAILY'], default: 'MONTHLY' },
    salary: { type: Number, required: true, min: 0 },

    // 0 = Sunday ... 6 = Saturday, null = no fixed weekly off.
    weeklyOff: { type: Number, min: 0, max: 6, default: null },

    joinDate: { type: String, required: true }, // YYYY-MM-DD
    leftDate: { type: String, default: null },
    status: { type: String, enum: ['ACTIVE', 'LEFT'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Employee', employeeSchema)
