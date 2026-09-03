import express from 'express'

import {
  getOverview,
} from './dashboardController.js'

import {
  protect,
} from '../../middlewares/authMiddleware.js'

import {
  validateQuery,
} from '../../middlewares/validateMiddleware.js'

import {
  dashboardQuerySchema,
} from './dashboardValidator.js'

const router = express.Router()

router.get(
  '/overview',
  protect,
  validateQuery(dashboardQuerySchema),
  getOverview
)

export default router