import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams } from '../middlewares/validateMiddleware.js'
import { kycUpload } from '../middlewares/kycUpload.js'
import { handle, idParam, objectId } from '../utils/http.js'
import {
  addKycDocument, findKycDocument, KYC_MANAGE_PERMISSIONS, kycView, loadTenantForStaff,
  removeKycDocument, reviewKyc, updateKycDetails, updatePoliceVerification,
} from '../services/kycService.js'
import { sendKycFile } from '../services/kycStorage.js'
import { createTenantLink } from '../services/tenantLinkService.js'
import { createAgreement, previewAgreement } from '../services/signingService.js'
import { kycDetailsSchema } from './residentDocsRouter.js'
import { KYC_DOCUMENT_KINDS } from '../models/Tenant.js'

// Owner / manager side of the resident form, ID documents, police verification and agreements.
// Mounted at /api/tenants next to the main tenant routes.
const router = express.Router()
const tenantParam = validateParams(idParam('tenantId'))
const clean = (body) => Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]))

const termsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.'),
  durationMonths: z.coerce.number().int().min(1).max(60),
  monthlyRent: z.coerce.number().min(0).max(1000000),
  deposit: z.coerce.number().min(0).max(10000000),
  dueDay: z.coerce.number().int().min(1).max(28),
  lockInMonths: z.coerce.number().int().min(0).max(36),
  noticePeriodDays: z.coerce.number().int().min(0).max(120),
  roomNumber: z.string().trim().max(20).optional().default(''),
  bedNumber: z.string().trim().max(20).optional().default(''),
  roomType: z.string().trim().max(20).optional().default(''),
}).strict()

router.get('/:tenantId/kyc', protect, tenantParam, handle(async (req) => kycView(await loadTenantForStaff(req.user, req.params.tenantId))))

router.put('/:tenantId/kyc', protect, tenantParam, validate(kycDetailsSchema), handle(async (req) => {
  const tenant = await loadTenantForStaff(req.user, req.params.tenantId, KYC_MANAGE_PERMISSIONS)
  return updateKycDetails(tenant, clean(req.body))
}, { message: 'Resident form saved.' }))

router.post('/:tenantId/kyc/documents', protect, tenantParam, kycUpload, handle(async (req) => {
  const kind = String(req.body?.kind || '')
  if (!KYC_DOCUMENT_KINDS.includes(kind)) {
    const error = new Error('Choose what this file is.')
    error.statusCode = 400
    throw error
  }
  const tenant = await loadTenantForStaff(req.user, req.params.tenantId, KYC_MANAGE_PERMISSIONS)
  return addKycDocument(tenant, { kind, file: req.file, user: req.user })
}, { status: 201, message: 'File uploaded.' }))

router.get('/:tenantId/kyc/documents/:docId/file', protect, async (req, res, next) => {
  try {
    objectId.parse(req.params.tenantId)
    objectId.parse(req.params.docId)
    const tenant = await loadTenantForStaff(req.user, req.params.tenantId)
    await sendKycFile(res, findKycDocument(tenant, req.params.docId))
  } catch (error) {
    next(error)
  }
})

router.delete('/:tenantId/kyc/documents/:docId', protect, handle(async (req) => {
  objectId.parse(req.params.tenantId)
  objectId.parse(req.params.docId)
  const tenant = await loadTenantForStaff(req.user, req.params.tenantId, KYC_MANAGE_PERMISSIONS)
  return removeKycDocument(tenant, req.params.docId)
}, { message: 'File removed.' }))

router.post('/:tenantId/kyc/review', protect, tenantParam, validate(z.object({
  decision: z.enum(['VERIFIED', 'REJECTED']),
  reason: z.string().trim().max(300).optional(),
}).strict()), handle(async (req) => {
  const tenant = await loadTenantForStaff(req.user, req.params.tenantId, KYC_MANAGE_PERMISSIONS)
  return reviewKyc(tenant, req.body, req.user)
}, { message: 'Saved.' }))

router.put('/:tenantId/kyc/police', protect, tenantParam, validate(z.object({
  status: z.enum(['NOT_STARTED', 'SUBMITTED', 'VERIFIED']).optional(),
  station: z.string().trim().max(120).optional().nullable(),
  referenceNumber: z.string().trim().max(60).optional().nullable(),
  submittedOn: z.union([z.coerce.date(), z.literal(''), z.null()]).optional(),
  verifiedOn: z.union([z.coerce.date(), z.literal(''), z.null()]).optional(),
  notes: z.string().trim().max(300).optional().nullable(),
}).strict()), handle(async (req) => {
  const tenant = await loadTenantForStaff(req.user, req.params.tenantId, KYC_MANAGE_PERMISSIONS)
  return updatePoliceVerification(tenant, req.body)
}, { message: 'Police verification saved.' }))

router.post('/:tenantId/link', protect, tenantParam, validate(z.object({ send: z.boolean().optional() }).strict()), handle(
  (req) => createTenantLink({ user: req.user, tenantId: req.params.tenantId, send: Boolean(req.body.send) }),
  { message: 'Link ready.' }
))

router.post('/:tenantId/agreement/preview', protect, tenantParam, validate(z.object({ terms: termsSchema.optional() }).strict()), handle(
  (req) => previewAgreement({ user: req.user, tenantId: req.params.tenantId, terms: req.body.terms })
))

router.post('/:tenantId/agreement', protect, tenantParam, validate(z.object({ terms: termsSchema }).strict()), handle(
  (req) => createAgreement({ user: req.user, tenantId: req.params.tenantId, terms: req.body.terms }),
  { status: 201, message: 'Agreement ready for signing.' }
))

export default router
