import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
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

    roomNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    floor: {
      type: Number,
      required: true,
      min: 0,
    },

    type: {
      type: String,
      enum: [
        'SINGLE',
        'DOUBLE',
        'TRIPLE',
        'DORMITORY',
      ],
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'MAINTENANCE',
        'INACTIVE',
      ],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
)

roomSchema.index(
  {
    property: 1,
    roomNumber: 1,
  },
  {
    unique: true,
  }
)

const Room = mongoose.model(
  'Room',
  roomSchema
)

export default Room