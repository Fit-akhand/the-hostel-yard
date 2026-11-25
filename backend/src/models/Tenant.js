import mongoose from 'mongoose'

export const KYC_STATUSES = ['NOT_STARTED', 'SUBMITTED', 'VERIFIED', 'REJECTED']
export const ID_TYPES = ['AADHAAR', 'PAN', 'DRIVING_LICENCE', 'PASSPORT', 'VOTER_ID', 'OTHER']
export const KYC_DOCUMENT_KINDS = ['PHOTO', 'ID_FRONT', 'ID_BACK', 'POLICE_FORM', 'OTHER']

const kycDocumentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KYC_DOCUMENT_KINDS, required: true },
    // 'cloudinary' files are uploaded as private assets; 'database' files live in the storedfiles collection.
    storage: { type: String, enum: ['cloudinary', 'database'], required: true },
    publicId: { type: String, default: null },
    resourceType: { type: String, default: null },
    format: { type: String, default: null },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile', default: null },
    mimeType: { type: String, default: null },
    bytes: { type: Number, default: 0 },
    originalName: { type: String, default: null, maxlength: 200 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedVia: { type: String, enum: ['STAFF', 'RESIDENT'], default: 'STAFF' },
  },
  { _id: true }
)

const kycSchema = new mongoose.Schema(
  {
    status: { type: String, enum: KYC_STATUSES, default: 'NOT_STARTED' },
    details: {
      fatherName: { type: String, trim: true, maxlength: 100, default: null },
      motherName: { type: String, trim: true, maxlength: 100, default: null },
      dateOfBirth: { type: Date, default: null },
      bloodGroup: { type: String, trim: true, maxlength: 5, default: null },
      permanentAddress: { type: String, trim: true, maxlength: 400, default: null },
      city: { type: String, trim: true, maxlength: 80, default: null },
      state: { type: String, trim: true, maxlength: 80, default: null },
      pincode: { type: String, trim: true, maxlength: 10, default: null },
      occupation: { type: String, enum: ['STUDENT', 'WORKING', 'OTHER', null], default: null },
      institution: { type: String, trim: true, maxlength: 150, default: null },
      institutionAddress: { type: String, trim: true, maxlength: 300, default: null },
      courseOrDesignation: { type: String, trim: true, maxlength: 100, default: null },
      idType: { type: String, enum: [...ID_TYPES, null], default: null },
      // Only the last four characters are kept. The full ID number is never stored.
      idLast4: { type: String, trim: true, maxlength: 4, default: null },
      guardianName: { type: String, trim: true, maxlength: 100, default: null },
      guardianPhone: { type: String, trim: true, maxlength: 20, default: null },
      guardianRelation: { type: String, trim: true, maxlength: 40, default: null },
      guardianAddress: { type: String, trim: true, maxlength: 300, default: null },
      vehicleNumber: { type: String, trim: true, maxlength: 20, default: null },
      medicalNotes: { type: String, trim: true, maxlength: 300, default: null },
    },
    documents: { type: [kycDocumentSchema], default: [] },
    residentForm: { type: mongoose.Schema.Types.ObjectId, ref: 'SignedDocument', default: null },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },
    police: {
      status: { type: String, enum: ['NOT_STARTED', 'SUBMITTED', 'VERIFIED'], default: 'NOT_STARTED' },
      station: { type: String, trim: true, maxlength: 120, default: null },
      referenceNumber: { type: String, trim: true, maxlength: 60, default: null },
      submittedOn: { type: Date, default: null },
      verifiedOn: { type: Date, default: null },
      notes: { type: String, trim: true, maxlength: 300, default: null },
    },
  },
  { _id: false }
)

const tenantSchema = new mongoose.Schema(
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

    // Left out entirely until the tenant accepts an invitation. It must never be stored as null: a unique
    // index treats null as a value, so a second tenant without an account would be rejected.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: true,
    },

    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: null,
      },

      phone: {
        type: String,
        trim: true,
        default: null,
      },

      relationship: {
        type: String,
        trim: true,
        default: null,
      },
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    moveInDate: {
      type: Date,
      required: true,
    },

    noticeDate: {
      type: Date,
      default: null,
    },

    expectedMoveOutDate: {
      type: Date,
      default: null,
    },

    actualMoveOutDate: {
      type: Date,
      default: null,
    },

    // Who started the notice period, and the reason the resident gave.
    noticeGivenBy: {
      type: String,
      enum: ['TENANT', 'MANAGEMENT', null],
      default: null,
    },

    moveOutReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'NOTICE_PERIOD',
        'LEFT',
      ],
      default: 'ACTIVE',
    },

    // Resident form (KYC): personal details, ID documents and police verification.
    kyc: {
      type: kycSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
)

tenantSchema.index({
  organization: 1,
  property: 1,
})

tenantSchema.index({
  property: 1,
  phone: 1,
})

tenantSchema.index({ organization: 1, 'kyc.status': 1 })

// One account per tenant, checked only for tenants that have one.
tenantSchema.index(
  { user: 1 },
  {
    unique: true,
    name: 'user_linked_unique',
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
)

const Tenant = mongoose.model(
  'Tenant',
  tenantSchema
)

export default Tenant