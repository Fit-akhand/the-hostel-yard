import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import { handle, idParam, objectId, optionalDate, phoneField } from '../utils/http.js'
import { createEnquiry, getEnquiry, listEnquiries, updateEnquiry } from '../services/enquiryService.js'
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES } from '../models/Enquiry.js'

const router = express.Router()
router.use(protect)

const sharing = z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'ANY']).nullable().optional()
const gender = z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional()

router.get(
  '/',
  validateQuery(z.object({
    status: z.enum([...ENQUIRY_STATUSES, 'OPEN', 'ALL']).optional(),
    propertyId: objectId.optional(),
    search: z.string().max(50).optional(),
  })),
  handle((req) => listEnquiries({ user: req.user, ...req.validatedQuery }))
)

router.post(
  '/',
  validate(z.object({
    propertyId: objectId,
    name: z.string().trim().min(2, 'Enter the name.').max(100),
    phone: phoneField,
    email: z.string().trim().email().max(120).optional().or(z.literal('')),
    gender,
    sharing,
    moveInDate: optionalDate,
    message: z.string().trim().max(1000).optional(),
    source: z.enum(ENQUIRY_SOURCES).optional(),
  }).strict()),
  handle((req) => createEnquiry({ user: req.user, data: req.body }), { status: 201, message: 'Enquiry added.' })
)

router.get('/:id', validateParams(idParam()), handle((req) => getEnquiry({ user: req.user, id: req.params.id })))

router.patch(
  '/:id',
  validateParams(idParam()),
  validate(z.object({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    followUpOn: optionalDate,
    visitOn: optionalDate,
    lostReason: z.string().trim().max(200).optional(),
    note: z.string().trim().min(1).max(1000).optional(),
    tenantId: objectId.optional(),
  }).strict()),
  handle((req) => updateEnquiry({ user: req.user, id: req.params.id, data: req.body }), { message: 'Enquiry updated.' })
)

export default router
