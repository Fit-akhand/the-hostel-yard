import Tenant, { ID_TYPES, KYC_DOCUMENT_KINDS } from '../models/Tenant.js'
import SignedDocument from '../models/SignedDocument.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { deliver } from '../messaging/deliveryService.js'
import { checkPropertyAccess, createError, isDemoOrganization, notifyStaff, notifyTenantInApp } from './access.js'
import { deleteKycFile, KYC_MAX_BYTES, KYC_MIME_TYPES, saveKycFile } from './kycStorage.js'
import { buildResidentForm } from './signingService.js'

export const KYC_VIEW_PERMISSIONS = [PERMISSIONS.VIEW_TENANTS, PERMISSIONS.VIEW_DOCUMENTS]
export const KYC_MANAGE_PERMISSIONS = [PERMISSIONS.EDIT_TENANTS, PERMISSIONS.UPDATE_TENANTS, PERMISSIONS.MANAGE_DOCUMENTS]

const DETAIL_FIELDS = [
  'fatherName', 'motherName', 'dateOfBirth', 'bloodGroup', 'permanentAddress', 'city', 'state', 'pincode',
  'occupation', 'institution', 'institutionAddress', 'courseOrDesignation', 'idType',
  'guardianName', 'guardianPhone', 'guardianRelation', 'guardianAddress', 'vehicleNumber', 'medicalNotes',
]

export const ID_LABELS = {
  AADHAAR: 'Aadhaar card',
  PAN: 'PAN card',
  DRIVING_LICENCE: 'Driving licence',
  PASSPORT: 'Passport',
  VOTER_ID: 'Voter ID',
  OTHER: 'Other ID',
}

export const loadTenantForStaff = async (user, tenantId, permission = KYC_VIEW_PERMISSIONS) => {
  const tenant = await Tenant.findOne({ _id: tenantId, organization: user.organization }).populate('property', 'name address city state pincode')
  if (!tenant) throw createError('Tenant not found.', 404)
  await checkPropertyAccess({ user, propertyId: tenant.property._id, permission })
  return tenant
}

// What still has to be filled in before the resident form can be submitted.
export const missingForSubmit = (tenant) => {
  const d = tenant.kyc?.details || {}
  const kinds = new Set((tenant.kyc?.documents || []).map((doc) => doc.kind))
  const missing = []
  if (!d.fatherName) missing.push("Father's or guardian's name")
  if (!d.dateOfBirth) missing.push('Date of birth')
  if (!d.permanentAddress) missing.push('Permanent address')
  if (!d.idType) missing.push('ID type')
  if (!d.idLast4) missing.push('Last 4 digits of the ID')
  if (!kinds.has('PHOTO')) missing.push('Your photo')
  if (!kinds.has('ID_FRONT')) missing.push('ID card (front)')
  return missing
}

export const kycView = (tenant) => {
  const kyc = tenant.kyc?.toObject ? tenant.kyc.toObject() : tenant.kyc || {}
  return {
    status: kyc.status || 'NOT_STARTED',
    details: kyc.details || {},
    documents: (kyc.documents || []).map((doc) => ({
      _id: doc._id,
      kind: doc.kind,
      mimeType: doc.mimeType,
      bytes: doc.bytes,
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
      uploadedVia: doc.uploadedVia,
    })),
    residentForm: kyc.residentForm || null,
    submittedAt: kyc.submittedAt || null,
    reviewedAt: kyc.reviewedAt || null,
    rejectionReason: kyc.rejectionReason || null,
    police: kyc.police || { status: 'NOT_STARTED' },
    missing: missingForSubmit(tenant),
  }
}

// "1234 5678 9012" -> "9012". Only these four characters are ever stored.
export const lastFour = (value) => {
  const clean = String(value || '').replace(/[\s-]/g, '').toUpperCase()
  return clean.length >= 4 ? clean.slice(-4) : null
}

export const updateKycDetails = async (tenant, data, { byResident = false } = {}) => {
  if (byResident && tenant.kyc?.status === 'VERIFIED') {
    throw createError('Your form is already verified. Ask the management if something needs to change.', 400)
  }
  if (byResident && tenant.kyc?.status === 'SUBMITTED') {
    throw createError('Your form is waiting for verification. Ask the management if something needs to change.', 400)
  }

  const details = tenant.kyc.details
  for (const field of DETAIL_FIELDS) {
    if (data[field] === undefined) continue
    const value = typeof data[field] === 'string' ? data[field].trim() : data[field]
    details[field] = value === '' ? null : value
  }
  if (data.idType !== undefined && data.idType !== null && !ID_TYPES.includes(data.idType)) {
    throw createError('Choose a valid ID type.', 400)
  }
  if (data.idNumber !== undefined) {
    const last = lastFour(data.idNumber)
    if (data.idNumber && !last) throw createError('Enter at least the last 4 characters of the ID number.', 400)
    details.idLast4 = last
  }

  // Keep the main tenant record in step with the form.
  if (byResident || !tenant.address) {
    if (details.permanentAddress) tenant.address = details.permanentAddress
  }
  if (details.guardianName && !tenant.emergencyContact?.name) {
    tenant.emergencyContact = {
      name: details.guardianName,
      phone: details.guardianPhone || tenant.emergencyContact?.phone || null,
      relationship: details.guardianRelation || tenant.emergencyContact?.relationship || null,
    }
  }
  await tenant.save()
  return kycView(tenant)
}

export const addKycDocument = async (tenant, { kind, file, user = null, byResident = false }) => {
  if (!KYC_DOCUMENT_KINDS.includes(kind)) throw createError('Choose what this file is.', 400)
  if (!file) throw createError('Choose a file to upload.', 400)
  if (!KYC_MIME_TYPES.includes(file.mimetype)) throw createError('Only JPG, PNG, WEBP images and PDF files are allowed.', 400)
  if (file.size > KYC_MAX_BYTES) throw createError('The file is larger than 4 MB. Take a smaller photo or compress the PDF.', 400)
  if (kind === 'PHOTO' && file.mimetype === 'application/pdf') throw createError('The photo must be an image, not a PDF.', 400)
  if (byResident && ['VERIFIED', 'SUBMITTED'].includes(tenant.kyc?.status)) {
    throw createError('Your form is locked while it is being verified. Ask the management if a file needs to change.', 400)
  }
  if (byResident && kind === 'POLICE_FORM') throw createError('The police form is uploaded by the management.', 400)

  const others = tenant.kyc.documents.filter((d) => d.kind === 'OTHER')
  if (kind === 'OTHER' && others.length >= 3) throw createError('You can keep up to 3 extra files. Remove one first.', 400)

  const stored = await saveKycFile({ organization: tenant.organization, tenantId: tenant._id, buffer: file.buffer, mimeType: file.mimetype })

  // One file per kind (except "other"): a new upload replaces the old one.
  const replaced = kind === 'OTHER' ? [] : tenant.kyc.documents.filter((d) => d.kind === kind)
  tenant.kyc.documents = tenant.kyc.documents.filter((d) => !replaced.includes(d))
  tenant.kyc.documents.push({
    kind,
    ...stored,
    mimeType: file.mimetype,
    originalName: String(file.originalname || '').slice(0, 200),
    uploadedBy: user?._id || null,
    uploadedVia: byResident ? 'RESIDENT' : 'STAFF',
  })
  await tenant.save()
  await Promise.all(replaced.map((d) => deleteKycFile(d)))
  return kycView(tenant)
}

export const removeKycDocument = async (tenant, docId, { byResident = false } = {}) => {
  const doc = tenant.kyc.documents.id(docId)
  if (!doc) throw createError('File not found.', 404)
  if (byResident && (['VERIFIED', 'SUBMITTED'].includes(tenant.kyc.status) || doc.uploadedVia !== 'RESIDENT')) {
    throw createError('You cannot remove this file. Ask the management.', 400)
  }
  tenant.kyc.documents.pull(doc._id)
  await tenant.save()
  await deleteKycFile(doc)
  return kycView(tenant)
}

export const findKycDocument = (tenant, docId) => {
  const doc = tenant.kyc?.documents?.id(docId)
  if (!doc) throw createError('File not found.', 404)
  return doc
}

// The resident signs the declaration. This freezes their answers in a signed resident form and sends the
// form to the management for verification.
export const submitResidentForm = async (tenant, { signature, name, consent }, context) => {
  if (['VERIFIED', 'SUBMITTED'].includes(tenant.kyc.status)) throw createError('Your form has already been submitted.', 400)
  const missing = missingForSubmit(tenant)
  if (missing.length) throw createError(`Please complete: ${missing.join(', ')}.`, 400)

  const form = await buildResidentForm(tenant, { signature, name, consent }, context)
  tenant.kyc.status = 'SUBMITTED'
  tenant.kyc.submittedAt = new Date()
  tenant.kyc.rejectionReason = null
  tenant.kyc.residentForm = form._id
  await tenant.save()

  notifyStaff({
    organization: tenant.organization,
    property: tenant.property?._id || tenant.property,
    type: 'KYC_SUBMITTED',
    title: 'Resident form submitted',
    message: `${tenant.name} submitted their resident form and ID. Please verify it.`,
    data: { tenantId: tenant._id },
    external: false,
  })

  return { kyc: kycView(tenant), residentForm: form }
}

export const reviewKyc = async (tenant, { decision, reason }, user) => {
  if (decision === 'VERIFIED') {
    const kinds = new Set(tenant.kyc.documents.map((d) => d.kind))
    if (!kinds.has('ID_FRONT')) throw createError('Upload the ID card (front) before verifying.', 400)
    tenant.kyc.status = 'VERIFIED'
    tenant.kyc.rejectionReason = null
  } else {
    if (!reason?.trim()) throw createError('Say what needs to be fixed.', 400)
    tenant.kyc.status = 'REJECTED'
    tenant.kyc.rejectionReason = reason.trim()
  }
  tenant.kyc.reviewedAt = new Date()
  tenant.kyc.reviewedBy = user._id
  await tenant.save()

  const propertyName = tenant.property?.name || 'your PG'
  notifyTenantInApp({
    tenant,
    type: 'KYC_REVIEWED',
    title: decision === 'VERIFIED' ? 'Documents verified' : 'Resident form needs a fix',
    message: decision === 'VERIFIED' ? 'Your resident form and ID are verified.' : `Please update your resident form: ${tenant.kyc.rejectionReason}`,
  })
  if (!(await isDemoOrganization(tenant.organization))) {
    deliver({
      organization: tenant.organization,
      property: tenant.property?._id || tenant.property,
      tenant: tenant._id,
      type: 'KYC_REVIEWED',
      vars: { name: tenant.name.split(' ')[0], property: propertyName, approved: decision === 'VERIFIED', reason: tenant.kyc.rejectionReason },
      to: { phone: tenant.phone, email: tenant.email },
      dedupeKey: `kyc-review:${tenant._id}:${tenant.kyc.reviewedAt.getTime()}`,
    })
  }

  return kycView(tenant)
}

export const updatePoliceVerification = async (tenant, data) => {
  const police = tenant.kyc.police
  for (const field of ['status', 'station', 'referenceNumber', 'submittedOn', 'verifiedOn', 'notes']) {
    if (data[field] === undefined) continue
    police[field] = data[field] === '' ? null : data[field]
  }
  if (police.status === 'SUBMITTED' && !police.submittedOn) police.submittedOn = new Date()
  if (police.status === 'VERIFIED' && !police.verifiedOn) police.verifiedOn = new Date()
  await tenant.save()
  return kycView(tenant)
}

export const kycCounts = async (organization, propertyIds) => {
  const rows = await Tenant.aggregate([
    { $match: { organization, property: { $in: propertyIds }, status: { $ne: 'LEFT' } } },
    { $group: { _id: { $ifNull: ['$kyc.status', 'NOT_STARTED'] }, n: { $sum: 1 } } },
  ])
  return Object.fromEntries(rows.map((r) => [r._id, r.n]))
}

export const residentFormFor = (tenant) =>
  tenant.kyc?.residentForm ? SignedDocument.findById(tenant.kyc.residentForm).lean() : null
