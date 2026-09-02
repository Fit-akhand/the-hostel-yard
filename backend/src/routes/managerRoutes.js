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

import {
  createManagerInvitationSchema,
  activateManagerSchema,
  updateManagerPermissionsSchema,
} from '../validators/managerValidator.js'

const router = express.Router()

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
  getManagerInvitation
)

router.post(
  '/invitations/:token/activate',
  validate(activateManagerSchema),
  activateManager
)

export default router