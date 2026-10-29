import express from 'express'

import {
  createRentPlan,
  generateRentDue,
  generateMonthlyDues,
  getRentPlans,
  getRentDues,
  getTenantRentPaymentInfo,
} from '../controllers/rentController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
} from '../middlewares/validateMiddleware.js'

import {
  createRentPlanSchema,
  rentPlanIdParamSchema,
  generateRentDueSchema,
  generateMonthlyDuesSchema,
  rentDueIdParamSchema,
} from '../validators/rentValidator.js'

const router = express.Router()


router.post(
  '/plans',
  protect,
  validate(createRentPlanSchema),
  createRentPlan
)

router.post(
  '/dues/generate',
  protect,
  validate(generateMonthlyDuesSchema),
  generateMonthlyDues
)

router.get(
  '/plans',
  protect,
  getRentPlans
)

router.post(
  '/plans/:rentPlanId/due',
  protect,
  validateParams(rentPlanIdParamSchema),
  validate(generateRentDueSchema),
  generateRentDue
)

// --------------------------------------------------
// TENANT RENT PAYMENT INFO
// --------------------------------------------------

router.get(
  '/dues/:rentDueId/payment-info',
  protect,
  validateParams(
    rentDueIdParamSchema
  ),
  getTenantRentPaymentInfo
)

router.get(
  '/dues',
  protect,
  getRentDues
)

export default router