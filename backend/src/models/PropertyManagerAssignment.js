import mongoose from 'mongoose'

const propertyManagerAssignmentSchema =
  new mongoose.Schema(
    {
      manager: {
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

propertyManagerAssignmentSchema.index(
  {
    manager: 1,
    property: 1,
  },
  {
    unique: true,
  }
)

const PropertyManagerAssignment =
  mongoose.model(
    'PropertyManagerAssignment',
    propertyManagerAssignmentSchema
  )

export default PropertyManagerAssignment