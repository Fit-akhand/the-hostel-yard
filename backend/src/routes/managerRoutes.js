import express from 'express'

import {
  createManagerInvitation,
  getManagerInvitation,
  activateManager,
  updateManagerPermissions,
} from '../controllers/managerController.js'

import { protect } from '../middlewares/authMiddleware.js'

import { authorizeRoles } from '../middlewares/roleMiddleware.js'

import { validate } from '../middlewares/validateMiddleware.js'
import { rateLimit, MINUTE } from '../middlewares/rateLimit.js'

import {
  createManagerInvitationSchema,
  activateManagerSchema,
  updateManagerPermissionsSchema,
} from '../validators/managerValidator.js'

const router = express.Router()

// Public links: limited per network so invitation tokens cannot be guessed at speed.
const activationLimit = rateLimit({ name: 'activate-ip', windowMs: 15 * MINUTE, max: 20 })

router.post(
  '/invitations',
  protect,
  authorizeRoles('BUSINESS_OWNER'),
  validate(createManagerInvitationSchema),
  createManagerInvitation
)

router.patch(
  '/:managerId/properties/:propertyId/permissions',
  protect,
  authorizeRoles('BUSINESS_OWNER'),
  validate(updateManagerPermissionsSchema),
  updateManagerPermissions
)

router.get(
  '/invitations/:token',
  activationLimit,
  getManagerInvitation
)

router.post(
  '/invitations/:token/activate',
  activationLimit,
  validate(activateManagerSchema),
  activateManager
)

export default router