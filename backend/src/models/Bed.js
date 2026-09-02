import mongoose from 'mongoose'

const bedSchema = new mongoose.Schema(
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

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },

    bedNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'INACTIVE',
      ],
      default: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
  }
)

// A bed number must be unique inside a room.
bedSchema.index(
  {
    room: 1,
    bedNumber: 1,
  },
  {
    unique: true,
  }
)

bedSchema.index({
  organization: 1,
  property: 1,
  room: 1,
})

const Bed = mongoose.model('Bed', bedSchema)

export default Bed