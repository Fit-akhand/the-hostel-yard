import express from 'express'

import {
  createPaymentSettings,
  getPaymentSettings,
  updatePaymentSettings,
  enablePaymentSettings,
  disablePaymentSettings,
} from '../controllers/paymentSettingsController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
} from '../middlewares/validateMiddleware.js'

import {
  propertyIdParamSchema,
  createPaymentSettingsSchema,
  updatePaymentSettingsSchema,
} from '../validators/paymentSettingsValidator.js'

const router = express.Router()

// --------------------------------------------------
// GET PAYMENT SETTINGS
// --------------------------------------------------

router.get(
  '/property/:propertyId',
  protect,
  validateParams(
    propertyIdParamSchema
  ),
  getPaymentSettings
)

// --------------------------------------------------
// CREATE PAYMENT SETTINGS
// --------------------------------------------------

router.post(
  '/property/:propertyId',
  protect,
  validateParams(
    propertyIdParamSchema
  ),
  validate(
    createPaymentSettingsSchema
  ),
  createPaymentSettings
)

// --------------------------------------------------
// UPDATE PAYMENT SETTINGS
// --------------------------------------------------

router.put(
  '/property/:propertyId',
  protect,
  validateParams(
    propertyIdParamSchema
  ),
  validate(
    updatePaymentSettingsSchema
  ),
  updatePaymentSettings
)

// --------------------------------------------------
// ENABLE
// --------------------------------------------------

router.patch(
  '/property/:propertyId/enable',
  protect,
  validateParams(
    propertyIdParamSchema
  ),
  enablePaymentSettings
)

// --------------------------------------------------
// DISABLE
// --------------------------------------------------

router.patch(
  '/property/:propertyId/disable',
  protect,
  validateParams(
    propertyIdParamSchema
  ),
  disablePaymentSettings
)

export default router