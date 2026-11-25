import express from 'express'

import {
  inviteTenant,
  acceptTenantInvitation,
} from '../controllers/tenantAccountController.js'

import {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  startTenantNotice,
  moveOutTenant,
} from '../controllers/tenantController.js'
import { cancelTenantNotice } from '../services/tenantService.js'

import {
  protect,
} from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createTenantSchema,
  tenantIdParamSchema,
  updateTenantSchema,
  tenantNoticeSchema,
  tenantMoveOutSchema,
  tenantListQuerySchema,
} from '../validators/tenantValidator.js'

import {
  acceptTenantInvitationSchema,
} from '../validators/tenantAccountValidator.js'
import { rateLimit, MINUTE } from '../middlewares/rateLimit.js'

const router = express.Router()

// Public links: limited per network so invitation tokens cannot be guessed at speed.
const activationLimit = rateLimit({ name: 'activate-ip', windowMs: 15 * MINUTE, max: 20 })

// --------------------------------------------------
// INVITE TENANT
// --------------------------------------------------

router.post(
  '/:tenantId/invite',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  inviteTenant
)

// --------------------------------------------------
// ACCEPT TENANT INVITATION
// --------------------------------------------------

router.post(
  '/accept-invitation',
  activationLimit,
  validate(
    acceptTenantInvitationSchema
  ),
  acceptTenantInvitation
)

// --------------------------------------------------
// CREATE TENANT
// --------------------------------------------------

router.post(
  '/',
  protect,
  validate(createTenantSchema),
  createTenant
)

// --------------------------------------------------
// GET TENANTS
// --------------------------------------------------

router.get(
  '/',
  protect,
  validateQuery(
    tenantListQuerySchema
  ),
  getTenants
)

// --------------------------------------------------
// GET TENANT
// --------------------------------------------------

router.get(
  '/:tenantId',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  getTenantById
)

// --------------------------------------------------
// UPDATE TENANT
// --------------------------------------------------

router.put(
  '/:tenantId',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  validate(updateTenantSchema),
  updateTenant
)

// --------------------------------------------------
// START NOTICE
// --------------------------------------------------

router.post(
  '/:tenantId/notice',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  validate(tenantNoticeSchema),
  startTenantNotice
)

router.post(
  '/:tenantId/notice/cancel',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  async (req, res, next) => {
    try {
      const tenant = await cancelTenantNotice({ user: req.user, tenantId: req.params.tenantId })
      res.status(200).json({ success: true, message: 'Notice withdrawn. The tenant is staying on.', data: { tenant } })
    } catch (error) {
      next(error)
    }
  }
)

// --------------------------------------------------
// MOVE OUT
// --------------------------------------------------

router.post(
  '/:tenantId/move-out',
  protect,
  validateParams(
    tenantIdParamSchema
  ),
  validate(tenantMoveOutSchema),
  moveOutTenant
)

export default router