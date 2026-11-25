import Allocation from '../models/Allocation.js'
import Deposit from '../models/Deposit.js'
import DocumentTemplate from '../models/DocumentTemplate.js'
import FinanceSettings from '../models/FinanceSettings.js'
import Organization from '../models/Organization.js'
import RentPlan from '../models/RentPlan.js'
import SignedDocument from '../models/SignedDocument.js'
import Tenant from '../models/Tenant.js'
import User from '../models/User.js'
import { DEFAULT_TEMPLATES, PLACEHOLDERS } from '../constants/defaultTemplates.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { documentHash, formatDocDate, formatRupees, renderTemplate } from '../utils/documentText.js'
import { accessiblePropertyIds, checkPropertyAccess, createError, isOwner, notifyStaff, notifyTenantInApp } from './access.js'

const DOC_VIEW = [PERMISSIONS.VIEW_TENANTS, PERMISSIONS.VIEW_DOCUMENTS]
const DOC_MANAGE = [PERMISSIONS.MANAGE_DOCUMENTS, PERMISSIONS.EDIT_TENANTS]

export const ROOM_TYPE_WORDS = { SINGLE: 'single', DOUBLE: 'double', TRIPLE: 'triple', DORMITORY: 'dormitory' }
const ID_WORDS = { AADHAAR: 'Aadhaar', PAN: 'PAN', DRIVING_LICENCE: 'Driving Licence', PASSPORT: 'Passport', VOTER_ID: 'Voter ID', OTHER: 'ID' }

// --------------------------------------------------
// TEMPLATES
// --------------------------------------------------

export const getTemplate = async (organization, kind) => {
  const saved = await DocumentTemplate.findOne({ organization, kind }).lean()
  return {
    kind,
    title: saved?.title || DEFAULT_TEMPLATES[kind].title,
    body: saved?.body || DEFAULT_TEMPLATES[kind].body,
    isDefault: !saved,
    updatedAt: saved?.updatedAt || null,
    placeholders: PLACEHOLDERS[kind],
  }
}

export const saveTemplate = async (user, kind, { title, body }) => {
  if (!isOwner(user)) throw createError('Only the owner can change document wording.', 403)
  await DocumentTemplate.findOneAndUpdate(
    { organization: user.organization, kind },
    { $set: { title: title.trim(), body, updatedBy: user._id } },
    { upsert: true, runValidators: true }
  )
  return getTemplate(user.organization, kind)
}

export const resetTemplate = async (user, kind) => {
  if (!isOwner(user)) throw createError('Only the owner can change document wording.', 403)
  await DocumentTemplate.deleteOne({ organization: user.organization, kind })
  return getTemplate(user.organization, kind)
}

// --------------------------------------------------
// VALUES FOR PLACEHOLDERS
// --------------------------------------------------

const lateFeeText = (rule) => {
  if (!rule?.enabled) return ''
  const after = rule.graceDays ? ` after ${rule.graceDays} grace day${rule.graceDays === 1 ? '' : 's'}` : ''
  if (rule.mode === 'PER_DAY') return `A late fee of Rs. ${rule.amount} per day applies${after}${rule.maxAmount ? `, up to Rs. ${rule.maxAmount}` : ''}.`
  if (rule.mode === 'PERCENT') return `A late fee of ${rule.amount}% of the rent applies${after}.`
  return `A late fee of Rs. ${rule.amount} applies${after}.`
}

const ordinal = (n) => {
  const v = Number(n)
  if (!v) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const m = v % 100
  return `${v}${s[(m - 20) % 10] || s[m] || s[0]}`
}

const addMonths = (date, months) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + Number(months || 0))
  d.setDate(d.getDate() - 1)
  return d
}

const contextFor = async (tenant) => {
  const [org, allocation, plan, deposit, finance] = await Promise.all([
    Organization.findById(tenant.organization).select('name owner phone email address').lean(),
    Allocation.findOne({ tenant: tenant._id, status: 'ACTIVE' }).populate('room', 'roomNumber type').populate('bed', 'bedNumber').lean(),
    RentPlan.findOne({ tenant: tenant._id, status: 'ACTIVE' }).lean(),
    Deposit.findOne({ tenant: tenant._id }).sort({ createdAt: -1 }).lean(),
    FinanceSettings.findOne({ organization: tenant.organization }).lean(),
  ])
  const owner = org?.owner ? await User.findById(org.owner).select('name phone').lean() : null
  return { org, owner, allocation, plan, deposit, finance }
}

const propertyAddress = (property) =>
  [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') || null

// Suggested terms for a new agreement, taken from what the app already knows about the resident.
export const suggestedTerms = async (tenant) => {
  const { allocation, plan, deposit, finance } = await contextFor(tenant)
  const start = allocation?.startDate || tenant.moveInDate || new Date()
  return {
    startDate: new Date(start).toISOString().slice(0, 10),
    durationMonths: 11,
    monthlyRent: plan?.monthlyRent || 0,
    deposit: deposit?.amount || 0,
    dueDay: plan?.dueDay || 5,
    lockInMonths: 3,
    noticePeriodDays: finance?.noticePeriodDays ?? 30,
    roomNumber: allocation?.room?.roomNumber || '',
    bedNumber: allocation?.bed?.bedNumber || '',
    roomType: allocation?.room?.type || '',
  }
}

export const valuesFor = async (tenant, terms = {}) => {
  const { org, owner, finance } = await contextFor(tenant)
  const property = tenant.property || {}
  const d = tenant.kyc?.details || {}
  const start = terms.startDate ? new Date(terms.startDate) : null
  const end = start ? addMonths(start, terms.durationMonths || 11) : null

  return {
    agreementDate: formatDocDate(new Date()),
    city: property.city || null,
    organizationName: org?.name || null,
    ownerName: owner?.name || org?.name || null,
    ownerPhone: owner?.phone || org?.phone || null,
    ownerAddress: org?.address || propertyAddress(property),
    tenantName: tenant.name,
    fatherName: d.fatherName || null,
    tenantPhone: tenant.phone,
    permanentAddress: d.permanentAddress || tenant.address || null,
    idType: d.idType ? ID_WORDS[d.idType] : null,
    idLast4: d.idLast4 || null,
    propertyName: property.name || null,
    propertyAddress: propertyAddress(property),
    roomNumber: terms.roomNumber || null,
    bedNumber: terms.bedNumber || null,
    roomType: ROOM_TYPE_WORDS[terms.roomType] || terms.roomType || null,
    startDate: start ? formatDocDate(start) : null,
    endDate: end ? formatDocDate(end) : null,
    durationMonths: terms.durationMonths || null,
    monthlyRent: terms.monthlyRent ? formatRupees(terms.monthlyRent) : null,
    deposit: terms.deposit ? formatRupees(terms.deposit) : null,
    dueDay: ordinal(terms.dueDay || 5),
    lockInMonths: terms.lockInMonths ?? null,
    noticePeriodDays: terms.noticePeriodDays ?? finance?.noticePeriodDays ?? 30,
    lateFeeRule: lateFeeText(finance?.lateFee),
  }
}

// --------------------------------------------------
// DOCUMENTS (owner side)
// --------------------------------------------------

const loadTenant = async (user, tenantId, permission) => {
  const tenant = await Tenant.findOne({ _id: tenantId, organization: user.organization }).populate('property', 'name address city state pincode')
  if (!tenant) throw createError('Tenant not found.', 404)
  await checkPropertyAccess({ user, propertyId: tenant.property._id, permission })
  return tenant
}

const loadDocument = async (user, id, permission = DOC_VIEW) => {
  const doc = await SignedDocument.findOne({ _id: id, organization: user.organization })
  if (!doc) throw createError('Document not found.', 404)
  await checkPropertyAccess({ user, propertyId: doc.property, permission })
  return doc
}

export const previewAgreement = async ({ user, tenantId, terms }) => {
  const tenant = await loadTenant(user, tenantId, DOC_VIEW)
  const template = await getTemplate(user.organization, 'AGREEMENT')
  const useTerms = terms || (await suggestedTerms(tenant))
  return {
    terms: useTerms,
    title: template.title,
    body: renderTemplate(template.body, await valuesFor(tenant, useTerms)),
    templateIsDefault: template.isDefault,
  }
}

export const createAgreement = async ({ user, tenantId, terms }) => {
  const tenant = await loadTenant(user, tenantId, DOC_MANAGE)
  if (tenant.status === 'LEFT') throw createError('This resident has moved out.', 400)

  const open = await SignedDocument.findOne({ tenant: tenant._id, kind: 'AGREEMENT', status: { $in: ['SENT', 'TENANT_SIGNED'] } })
  if (open) throw createError('This resident already has an agreement waiting for signatures. Cancel it first to make a new one.', 400)

  const template = await getTemplate(user.organization, 'AGREEMENT')
  const body = renderTemplate(template.body, await valuesFor(tenant, terms))
  const data = { terms }

  const doc = await SignedDocument.create({
    organization: user.organization,
    property: tenant.property._id,
    tenant: tenant._id,
    kind: 'AGREEMENT',
    title: template.title,
    body,
    data,
    hash: documentHash(body, data),
    status: 'SENT',
    requiresCountersign: true,
    sentAt: new Date(),
    sentBy: user._id,
    createdBy: user._id,
  })

  notifyTenantInApp({
    tenant,
    type: 'DOCUMENT_TO_SIGN',
    title: 'Agreement to sign',
    message: `Your ${template.title.toLowerCase()} is ready. Open "Documents" to read and sign it.`,
    data: { documentId: doc._id },
  })

  return doc
}

export const listDocuments = async ({ user, tenantId, kind, status }) => {
  const allowed = await accessiblePropertyIds(user, DOC_VIEW)
  const filter = { organization: user.organization, property: { $in: allowed } }
  if (tenantId) filter.tenant = tenantId
  if (kind) filter.kind = kind
  if (status === 'WAITING') filter.status = { $in: ['SENT', 'TENANT_SIGNED'] }
  else if (status) filter.status = status
  return SignedDocument.find(filter)
    .select('-body -signatures.image')
    .populate('tenant', 'name phone')
    .populate('property', 'name')
    .sort({ createdAt: -1 })
    .limit(300)
    .lean()
}

export const getDocument = async ({ user, id }) => {
  const doc = await loadDocument(user, id)
  await doc.populate([{ path: 'tenant', select: 'name phone kyc.documents.kind kyc.documents._id' }, { path: 'property', select: 'name address city state pincode' }])
  return documentView(doc)
}

export const cancelDocument = async ({ user, id, reason }) => {
  const doc = await loadDocument(user, id, DOC_MANAGE)
  if (doc.kind !== 'AGREEMENT') throw createError('Only agreements can be cancelled here.', 400)
  if (['COMPLETED', 'CANCELLED'].includes(doc.status)) throw createError(`This agreement is already ${doc.status.toLowerCase()}.`, 400)
  doc.status = 'CANCELLED'
  doc.cancelledAt = new Date()
  doc.cancelledBy = user._id
  doc.cancelReason = reason?.trim() || null
  await doc.save()
  return documentView(doc)
}

// --------------------------------------------------
// SIGNING
// --------------------------------------------------

export const CONSENT_TEXT =
  'I have read this document. I agree to its terms and to signing it electronically, and I accept that my electronic signature is as valid as a handwritten one.'

const checkSignature = ({ signature, name, consent }) => {
  if (consent !== true) throw createError('Tick the box to confirm you agree.', 400)
  if (!name?.trim() || name.trim().length < 2) throw createError('Type your full name.', 400)
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(signature || ''))) throw createError('Draw your signature in the box.', 400)
  if (signature.length > 200000) throw createError('The signature is too large. Clear it and sign again.', 400)
  if (signature.length < 1500) throw createError('The signature is empty. Draw your signature in the box.', 400)
}

const signatureRecord = ({ role, signature, name, user = null }, context) => ({
  role,
  name: name.trim(),
  user,
  image: signature,
  signedAt: new Date(),
  ip: context.ip || null,
  userAgent: String(context.userAgent || '').slice(0, 400) || null,
  verifiedBy: context.verifiedBy,
  phoneLast4: context.phoneLast4 || null,
  consent: CONSENT_TEXT,
})

export const signAsTenant = async (tenant, documentId, input, context) => {
  checkSignature(input)
  const doc = await SignedDocument.findOne({ _id: documentId, tenant: tenant._id })
  if (!doc) throw createError('Document not found.', 404)
  if (doc.status !== 'SENT') throw createError(doc.status === 'CANCELLED' ? 'This document was cancelled.' : 'You have already signed this document.', 400)
  if (documentHash(doc.body, doc.data) !== doc.hash) throw createError('This document has changed since it was sent. Ask the management for a new one.', 409)

  doc.signatures.push({ ...signatureRecord({ role: 'TENANT', ...input, user: tenant.user || null }, context), documentHash: doc.hash })
  doc.status = doc.requiresCountersign ? 'TENANT_SIGNED' : 'COMPLETED'
  if (doc.status === 'COMPLETED') doc.completedAt = new Date()
  await doc.save()

  notifyStaff({
    organization: doc.organization,
    property: doc.property,
    type: 'DOCUMENT_SIGNED',
    title: `${doc.title} signed`,
    message: `${tenant.name} signed the ${doc.title.toLowerCase()}.${doc.requiresCountersign ? ' Please countersign it.' : ''}`,
    data: { documentId: doc._id, tenantId: tenant._id },
    external: false,
  })

  return documentView(doc)
}

export const signAsOwner = async ({ user, id, input, context }) => {
  checkSignature(input)
  const doc = await loadDocument(user, id, DOC_MANAGE)
  if (doc.status !== 'TENANT_SIGNED') {
    throw createError(doc.status === 'SENT' ? 'The resident has not signed yet.' : `This document is ${doc.status.toLowerCase().replace('_', ' ')}.`, 400)
  }
  doc.signatures.push({ ...signatureRecord({ role: 'OWNER', ...input, user: user._id }, { ...context, verifiedBy: 'LOGIN' }), documentHash: doc.hash })
  doc.status = 'COMPLETED'
  doc.completedAt = new Date()
  await doc.save()

  const tenant = await Tenant.findById(doc.tenant)
  notifyTenantInApp({
    tenant,
    type: 'DOCUMENT_SIGNED',
    title: `${doc.title} complete`,
    message: `Your ${doc.title.toLowerCase()} is signed by both sides. You can download a copy from "Documents".`,
    data: { documentId: doc._id },
  })

  return documentView(doc)
}

// House rules and declaration, filled in for one resident.
export const renderDeclaration = async (tenant) => {
  const template = await getTemplate(tenant.organization, 'RESIDENT_DECLARATION')
  const { org, plan, finance } = await contextFor(tenant)
  return {
    title: template.title,
    body: renderTemplate(template.body, {
      tenantName: tenant.name,
      propertyName: tenant.property?.name || null,
      organizationName: org?.name || null,
      dueDay: ordinal(plan?.dueDay || 5),
      noticePeriodDays: finance?.noticePeriodDays ?? 30,
      lateFeeRule: lateFeeText(finance?.lateFee),
    }),
  }
}

// The resident form: the declaration text plus a frozen copy of the resident's answers, signed by them.
export const buildResidentForm = async (tenant, input, context) => {
  checkSignature(input)
  const { title, body } = await renderDeclaration(tenant)
  const template = { title }

  const details = tenant.kyc.details?.toObject ? tenant.kyc.details.toObject() : { ...tenant.kyc.details }
  const data = {
    resident: {
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      gender: tenant.gender,
      moveInDate: tenant.moveInDate,
      emergencyContact: tenant.emergencyContact?.toObject ? tenant.emergencyContact.toObject() : tenant.emergencyContact,
    },
    details,
    documents: tenant.kyc.documents.map((d) => ({ id: String(d._id), kind: d.kind, uploadedAt: d.uploadedAt })),
  }
  const hash = documentHash(body, data)

  // A resubmission replaces the earlier, rejected form.
  await SignedDocument.updateMany(
    { tenant: tenant._id, kind: 'RESIDENT_FORM', status: { $ne: 'CANCELLED' } },
    { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Replaced by a new submission.' } }
  )

  return SignedDocument.create({
    organization: tenant.organization,
    property: tenant.property?._id || tenant.property,
    tenant: tenant._id,
    kind: 'RESIDENT_FORM',
    title: template.title,
    body,
    data,
    hash,
    status: 'COMPLETED',
    requiresCountersign: false,
    sentAt: new Date(),
    completedAt: new Date(),
    signatures: [{ ...signatureRecord({ role: 'TENANT', ...input, user: tenant.user || null }, context), documentHash: hash }],
  })
}

export const documentView = (docInput) => {
  const doc = docInput.toObject ? docInput.toObject() : docInput
  return {
    ...doc,
    integrityOk: documentHash(doc.body, doc.data) === doc.hash,
  }
}

// Documents a resident can see: their own, except drafts and cancelled ones.
export const listResidentDocuments = (tenant) =>
  SignedDocument.find({ tenant: tenant._id, status: { $in: ['SENT', 'TENANT_SIGNED', 'COMPLETED'] } })
    .select('kind title status sentAt completedAt createdAt signatures.role signatures.signedAt')
    .sort({ createdAt: -1 })
    .lean()

export const getResidentDocument = async (tenant, id) => {
  const doc = await SignedDocument.findOne({ _id: id, tenant: tenant._id, status: { $in: ['SENT', 'TENANT_SIGNED', 'COMPLETED'] } })
    .populate('property', 'name address city state pincode')
    .lean()
  if (!doc) throw createError('Document not found.', 404)
  return documentView(doc)
}
