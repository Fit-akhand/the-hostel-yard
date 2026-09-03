import express from 'express'

import {
  createPayment,
  getPayments,
  getPaymentById,
  verifyPayment,
  rejectPayment,
  createTenantPayment,
  getTenantPaymentInformation,
  getTenantPaymentHistory,
} from '../controllers/paymentController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  paymentIdParamSchema,
  createPaymentSchema,
  paymentListQuerySchema,
  rejectPaymentSchema,
  tenantPaymentHistoryQuerySchema,
} from '../validators/paymentValidator.js'

import {
  createTenantPaymentSchema,
} from '../validators/tenantPaymentValidator.js'

const router = express.Router()

// --------------------------------------------------
// GET PAYMENTS
// --------------------------------------------------

router.get(
  '/',
  protect,
  validateQuery(
    paymentListQuerySchema
  ),
  getPayments
)

// --------------------------------------------------
// CREATE PAYMENT
// --------------------------------------------------

router.post(
  '/',
  protect,
  validate(createPaymentSchema),
  createPayment
)

// --------------------------------------------------
// TENANT PAYMENT INFORMATION
// --------------------------------------------------

router.get(
  '/tenant/summary',
  protect,
  getTenantPaymentInformation
)

// --------------------------------------------------
// TENANT SUBMIT RENT PAYMENT
// --------------------------------------------------

router.post(
  '/tenant',
  protect,
  validate(
    createTenantPaymentSchema
  ),
  createTenantPayment
)

router.get(
  '/tenant/history',
  protect,
  validateQuery(tenantPaymentHistoryQuerySchema),
  getTenantPaymentHistory
)

// --------------------------------------------------
// GET PAYMENT BY ID
// --------------------------------------------------

router.get(
  '/:paymentId',
  protect,
  validateParams(
    paymentIdParamSchema
  ),
  getPaymentById
)

// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

router.post(
  '/:paymentId/verify',
  protect,
  validateParams(
    paymentIdParamSchema
  ),
  verifyPayment
)

// --------------------------------------------------
// REJECT PAYMENT
// --------------------------------------------------

router.post(
  '/:paymentId/reject',
  protect,
  validateParams(
    paymentIdParamSchema
  ),
  validate(rejectPaymentSchema),
  rejectPayment
)

export default router