import mongoose from 'mongoose'

const staffAssignmentSchema =
  new mongoose.Schema(
    {
      staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
      },

      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      designation: {
        type: String,
        trim: true,
        required: true,
        maxlength: 100,
      },

      permissions: [
        {
          type: String,
          required: true,
        },
      ],

      status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'REMOVED'],
        default: 'ACTIVE',
      },

      joiningDate: {
        type: Date,
        default: null,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },

      assignedAt: {
        type: Date,
        default: Date.now,
      },

      removedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  )

staffAssignmentSchema.index(
  {
    staff: 1,
    property: 1,
  },
  {
    unique: true,
  }
)

const StaffAssignment =
  mongoose.model(
    'StaffAssignment',
    staffAssignmentSchema
  )

export default StaffAssignment