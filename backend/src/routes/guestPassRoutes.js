import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import { handle, idParam, objectId, phoneField } from '../utils/http.js'
import { cancelAtGate, checkIn, checkOut, getGateLink, listPasses, requestAtGate, verifyCode } from '../services/guestPassService.js'

export const visitSchema = z.object({
  visitorName: z.string().trim().min(2, 'Enter the visitor name.').max(80),
  visitorPhone: phoneField,
  relation: z.string().trim().max(40).optional(),
  purpose: z.string().trim().max(200).optional(),
  guests: z.coerce.number().int().min(1).max(5).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the visit date.'),
  expectedTime: z.string().trim().max(20).optional(),
}).strict()

export const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(200).optional(),
}).strict()

// The gate side: owners, managers and staff. There is deliberately no approve route here.
const router = express.Router()
router.use(protect)

router.get('/', validateQuery(z.object({
  view: z.enum(['today', 'waiting', 'inside', 'upcoming', 'history']).optional(),
  propertyId: objectId.optional(),
})), handle((req) => listPasses({ user: req.user, ...req.validatedQuery })))

router.post('/', validate(visitSchema.extend({ tenantId: objectId })), handle(
  (req) => requestAtGate({ user: req.user, data: req.body }),
  { status: 201, message: 'Request sent to the resident.' }
))

router.post('/verify', validate(z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.') }).strict()), handle(
  (req) => verifyCode({ user: req.user, code: req.body.code })
))

router.get('/gate/:propertyId', validateParams(idParam('propertyId')), handle((req) => getGateLink({ user: req.user, propertyId: req.params.propertyId })))
router.post('/gate/:propertyId/reset', validateParams(idParam('propertyId')), handle(
  (req) => getGateLink({ user: req.user, propertyId: req.params.propertyId, reset: true }),
  { message: 'New QR code created. Print it again.' }
))

router.post('/:id/check-in', validateParams(idParam()), handle((req) => checkIn({ user: req.user, id: req.params.id }), { message: 'Checked in.' }))
router.post('/:id/check-out', validateParams(idParam()), handle((req) => checkOut({ user: req.user, id: req.params.id }), { message: 'Checked out.' }))
router.post('/:id/cancel', validateParams(idParam()), handle((req) => cancelAtGate({ user: req.user, id: req.params.id }), { message: 'Pass cancelled.' }))

export default router
