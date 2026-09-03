import express from 'express'

import {
  createStaff,
  getStaffList,
  getStaffDetails,
  updateStaffDetails,
  updateStaffStatus,
  getStaffInvitationDetails,
  activateStaffAccount,
} from '../controllers/staffController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createStaffSchema,
  staffIdParamSchema,
  updateStaffSchema,
  staffStatusSchema,
  staffListQuerySchema,
  activateStaffSchema,
} from '../validators/staffValidator.js'

const router =
  express.Router()


/*
|--------------------------------------------------------------------------
| Public invitation routes
|--------------------------------------------------------------------------
*/

router.get(
  '/invitations/:token',
  getStaffInvitationDetails
)

router.post(
  '/invitations/activate',
  validate(activateStaffSchema),
  activateStaffAccount
)


/*
|--------------------------------------------------------------------------
| Protected staff management routes
|--------------------------------------------------------------------------
*/

router.use(protect)


router.post(
  '/',
  validate(createStaffSchema),
  createStaff
)


router.get(
  '/',
  validateQuery(
    staffListQuerySchema
  ),
  getStaffList
)


router.get(
  '/:staffId',
  validateParams(
    staffIdParamSchema
  ),
  getStaffDetails
)


router.patch(
  '/:staffId',
  validateParams(
    staffIdParamSchema
  ),
  validate(updateStaffSchema),
  updateStaffDetails
)


router.patch(
  '/:staffId/status',
  validateParams(
    staffIdParamSchema
  ),
  validate(staffStatusSchema),
  updateStaffStatus
)

router.post(
  '/invitations/activate',
  validate(activateStaffSchema),
  activateStaffAccount
)


export default router