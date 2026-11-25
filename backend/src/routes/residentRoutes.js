import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import { validate, validateParams } from '../middlewares/validateMiddleware.js'
import { handle } from '../utils/http.js'
import { getMyTenancy, giveMyNotice, withdrawMyNotice } from '../services/residentService.js'
import { getMenuForResident } from '../services/foodMenuService.js'
import { tenantForUser } from '../services/access.js'
import { residentDocsRouter } from './residentDocsRouter.js'
import { cancelMine, decideMine, inviteGuest, listMyPasses } from '../services/guestPassService.js'
import { decisionSchema, visitSchema } from './guestPassRoutes.js'
import { idParam } from '../utils/http.js'

// Self-service for signed-in residents. Everything here works on the resident's own record only.
const router = express.Router()
router.use(protect, authorizeRoles('TENANT'))

router.get('/tenancy', handle((req) => getMyTenancy(req.user)))

router.post(
  '/notice',
  validate(z.object({
    expectedMoveOutDate: z.coerce.date({ message: 'Choose your move-out date.' }),
    reason: z.string().trim().max(300).optional(),
  }).strict()),
  handle((req) => giveMyNotice(req.user, req.body), { message: 'Your notice has been sent to the management.' })
)

router.post('/notice/withdraw', handle((req) => withdrawMyNotice(req.user), { message: 'Your notice has been withdrawn.' }))

router.get('/food-menu', handle((req) => getMenuForResident(req.user)))

// Guests: approve or decline requests, and invite your own guests.
router.get('/guests', handle((req) => listMyPasses(req.user)))
router.post('/guests', validate(visitSchema), handle((req) => inviteGuest(req.user, req.body), { status: 201, message: 'Guest pass created.' }))
router.post('/guests/:id/decision', validateParams(idParam()), validate(decisionSchema), handle((req) => decideMine(req.user, req.params.id, req.body), { message: 'Saved.' }))
router.post('/guests/:id/cancel', validateParams(idParam()), handle((req) => cancelMine(req.user, req.params.id), { message: 'Pass cancelled.' }))

// Resident form, ID upload and documents to sign, for signed-in residents.
router.use(residentDocsRouter({ resolveTenant: (req) => tenantForUser(req.user), verifiedBy: 'LOGIN' }))

export default router
