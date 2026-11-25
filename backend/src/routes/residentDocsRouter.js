import express from 'express'
import { z } from 'zod'

import { validate } from '../middlewares/validateMiddleware.js'
import { kycUpload } from '../middlewares/kycUpload.js'
import { rateLimit, HOUR } from '../middlewares/rateLimit.js'
import { handle, objectId } from '../utils/http.js'
import { addKycDocument, findKycDocument, kycView, removeKycDocument, submitResidentForm, updateKycDetails } from '../services/kycService.js'
import { sendKycFile } from '../services/kycStorage.js'
import { CONSENT_TEXT, getResidentDocument, listResidentDocuments, renderDeclaration, signAsTenant } from '../services/signingService.js'
import { maskPhone } from '../services/tenantLinkService.js'
import Organization from '../models/Organization.js'
import { ID_TYPES, KYC_DOCUMENT_KINDS } from '../models/Tenant.js'

const text = (max) => z.string().trim().max(max).optional().nullable()

export const kycDetailsSchema = z.object({
  fatherName: text(100),
  motherName: text(100),
  dateOfBirth: z.union([z.coerce.date(), z.literal(''), z.null()]).optional(),
  bloodGroup: text(5),
  permanentAddress: text(400),
  city: text(80),
  state: text(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.').optional().or(z.literal('')).nullable(),
  occupation: z.enum(['STUDENT', 'WORKING', 'OTHER']).optional().or(z.literal('')).nullable(),
  institution: text(150),
  institutionAddress: text(300),
  courseOrDesignation: text(100),
  idType: z.enum(ID_TYPES).optional().or(z.literal('')).nullable(),
  idNumber: z.string().trim().max(30).optional(),
  guardianName: text(100),
  guardianPhone: text(20),
  guardianRelation: text(40),
  guardianAddress: text(300),
  vehicleNumber: text(20),
  medicalNotes: text(300),
}).strict()

export const signSchema = z.object({
  signature: z.string().max(200000),
  name: z.string().trim().min(2).max(100),
  consent: z.boolean(),
}).strict()

const clean = (body) => Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === '' ? null : v]))

// Self-service routes shared by signed-in residents (/api/me) and private links (/api/public/resident/:token).
// `resolveTenant(req)` finds the resident; `verifiedBy` records how they proved who they are.
export const residentDocsRouter = ({ resolveTenant, verifiedBy }) => {
  const router = express.Router({ mergeParams: true })
  const uploadLimit = rateLimit({ name: `resident-upload-${verifiedBy}`, windowMs: HOUR, max: 40, key: (req) => `${req.ip}|${req.params.token || req.user?._id || ''}` })

  const withTenant = (work) => async (req, res) => work(await resolveTenant(req), req, res)
  const context = (req, tenant) => ({ ip: req.ip, userAgent: req.get('user-agent'), verifiedBy, phoneLast4: String(tenant.phone || '').replace(/\D/g, '').slice(-4) || null })

  router.get('/profile', handle(withTenant(async (tenant) => {
    const org = await Organization.findById(tenant.organization).select('name').lean()
    return {
      organizationName: org?.name || '',
      consentText: CONSENT_TEXT,
      tenant: {
        name: tenant.name,
        phoneMasked: maskPhone(tenant.phone),
        email: tenant.email,
        gender: tenant.gender,
        status: tenant.status,
        moveInDate: tenant.moveInDate,
        property: tenant.property ? { name: tenant.property.name, city: tenant.property.city } : null,
      },
      kyc: kycView(tenant),
      declaration: await renderDeclaration(tenant),
      documents: await listResidentDocuments(tenant),
    }
  })))

  router.put('/kyc', validate(kycDetailsSchema), handle(withTenant((tenant, req) => updateKycDetails(tenant, clean(req.body), { byResident: true })), { message: 'Saved.' }))

  router.post(
    '/kyc/documents',
    uploadLimit,
    kycUpload,
    handle(withTenant((tenant, req) => {
      const kind = String(req.body?.kind || '')
      if (!KYC_DOCUMENT_KINDS.includes(kind)) {
        const error = new Error('Choose what this file is.')
        error.statusCode = 400
        throw error
      }
      return addKycDocument(tenant, { kind, file: req.file, user: req.user || null, byResident: true })
    }), { status: 201, message: 'File uploaded.' })
  )

  router.delete('/kyc/documents/:docId', handle(withTenant((tenant, req) => {
    objectId.parse(req.params.docId)
    return removeKycDocument(tenant, req.params.docId, { byResident: true })
  }), { message: 'File removed.' }))

  router.get('/kyc/documents/:docId/file', async (req, res, next) => {
    try {
      objectId.parse(req.params.docId)
      const tenant = await resolveTenant(req)
      await sendKycFile(res, findKycDocument(tenant, req.params.docId))
    } catch (error) {
      next(error)
    }
  })

  router.post('/kyc/submit', validate(signSchema), handle(withTenant((tenant, req) => submitResidentForm(tenant, req.body, context(req, tenant))), { message: 'Your resident form has been submitted.' }))

  router.get('/documents/:docId', handle(withTenant((tenant, req) => {
    objectId.parse(req.params.docId)
    return getResidentDocument(tenant, req.params.docId)
  })))

  router.post('/documents/:docId/sign', validate(signSchema), handle(withTenant((tenant, req) => {
    objectId.parse(req.params.docId)
    return signAsTenant(tenant, req.params.docId, req.body, context(req, tenant))
  }), { message: 'Signed. Thank you!' }))

  return router
}
