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

const router = express.Router()

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