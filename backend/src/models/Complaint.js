import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },

    bed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: [
        'ELECTRICAL',
        'PLUMBING',
        'CLEANING',
        'FURNITURE',
        'AC',
        'WIFI',
        'SECURITY',
        'MAINTENANCE',
        'OTHER',
      ],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: [
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT',
      ],
      default: 'MEDIUM',
      index: true,
    },

    status: {
      type: String,
      enum: [
        'OPEN',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED',
        'CANCELLED',
      ],
      default: 'OPEN',
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

complaintSchema.index({
  organization: 1,
  property: 1,
  status: 1,
})

complaintSchema.index({
  organization: 1,
  tenant: 1,
  status: 1,
})

complaintSchema.index({
  organization: 1,
  property: 1,
  priority: 1,
})

const Complaint = mongoose.model(
  'Complaint',
  complaintSchema
)

export default Complaint