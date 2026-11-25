import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import { handle, idParam, objectId } from '../utils/http.js'
import {
  cancelDocument, getDocument, getTemplate, listDocuments, resetTemplate, saveTemplate, signAsOwner,
} from '../services/signingService.js'
import { accessiblePropertyIds } from '../services/access.js'
import { kycCounts } from '../services/kycService.js'
import { signSchema } from './residentDocsRouter.js'
import { TEMPLATE_KINDS } from '../models/DocumentTemplate.js'
import { PERMISSIONS } from '../constants/permissions.js'
import SignedDocument from '../models/SignedDocument.js'

export const documentRouter = express.Router()
documentRouter.use(protect)

documentRouter.get('/', validateQuery(z.object({
  tenantId: objectId.optional(),
  kind: z.enum(['AGREEMENT', 'RESIDENT_FORM']).optional(),
  status: z.enum(['SENT', 'TENANT_SIGNED', 'COMPLETED', 'CANCELLED', 'WAITING']).optional(),
})), handle((req) => listDocuments({ user: req.user, ...req.validatedQuery })))

// Counts for the dashboard and the tenant list: resident forms by status and agreements waiting for signatures.
documentRouter.get('/summary', handle(async (req) => {
  const properties = await accessiblePropertyIds(req.user, [PERMISSIONS.VIEW_TENANTS, PERMISSIONS.VIEW_DOCUMENTS])
  const [kyc, waitingTenant, waitingOwner] = await Promise.all([
    kycCounts(req.user.organization, properties),
    SignedDocument.countDocuments({ organization: req.user.organization, property: { $in: properties }, kind: 'AGREEMENT', status: 'SENT' }),
    SignedDocument.countDocuments({ organization: req.user.organization, property: { $in: properties }, kind: 'AGREEMENT', status: 'TENANT_SIGNED' }),
  ])
  return { kyc, agreements: { waitingForResident: waitingTenant, waitingForYou: waitingOwner } }
}))

documentRouter.get('/:id', validateParams(idParam()), handle((req) => getDocument({ user: req.user, id: req.params.id })))

documentRouter.post('/:id/countersign', validateParams(idParam()), validate(signSchema), handle(
  (req) => signAsOwner({ user: req.user, id: req.params.id, input: req.body, context: { ip: req.ip, userAgent: req.get('user-agent') } }),
  { message: 'Agreement signed by both sides.' }
))

documentRouter.post('/:id/cancel', validateParams(idParam()), validate(z.object({ reason: z.string().trim().max(300).optional() }).strict()), handle(
  (req) => cancelDocument({ user: req.user, id: req.params.id, reason: req.body.reason }),
  { message: 'Agreement cancelled.' }
))

export const templateRouter = express.Router()
templateRouter.use(protect)
const kindParam = validateParams(z.object({ kind: z.enum(TEMPLATE_KINDS) }))

templateRouter.get('/:kind', kindParam, handle((req) => getTemplate(req.user.organization, req.params.kind)))
templateRouter.put('/:kind', kindParam, validate(z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().min(50, 'The text is too short.').max(60000),
}).strict()), handle((req) => saveTemplate(req.user, req.params.kind, req.body), { message: 'Wording saved.' }))
templateRouter.delete('/:kind', kindParam, handle((req) => resetTemplate(req.user, req.params.kind), { message: 'Back to the standard wording.' }))
