import express from 'express'

import {
  occupancyReport,
  rentReport,
  paymentReport,
  expenseReport,
  complaintReport,
  tenantReport,
  bookingReport,
} from './reportController.js'

import {
  protect,
} from '../../middlewares/authMiddleware.js'

import {
  validateQuery,
} from '../../middlewares/validateMiddleware.js'

import {
  reportQuerySchema,
} from './reportValidator.js'

const router = express.Router()

router.get(
  '/occupancy',
  protect,
  validateQuery(reportQuerySchema),
  occupancyReport
)

router.get(
  '/rent',
  protect,
  validateQuery(reportQuerySchema),
  rentReport
)

router.get(
  '/payments',
  protect,
  validateQuery(reportQuerySchema),
  paymentReport
)

router.get(
  '/expenses',
  protect,
  validateQuery(reportQuerySchema),
  expenseReport
)

router.get(
  '/complaints',
  protect,
  validateQuery(reportQuerySchema),
  complaintReport
)

router.get(
  '/tenants',
  protect,
  validateQuery(reportQuerySchema),
  tenantReport
)

router.get(
  '/bookings',
  protect,
  validateQuery(reportQuerySchema),
  bookingReport
)

export default router