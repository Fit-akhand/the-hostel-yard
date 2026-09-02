import express from 'express'

import {
  createAllocation,
  getAllocations,
  getAllocationById,
  endAllocation,
} from '../controllers/allocationController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
} from '../middlewares/validateMiddleware.js'

import {
  createAllocationSchema,
  allocationIdParamSchema,
  endAllocationSchema,
} from '../validators/allocationValidator.js'

const router = express.Router()

router.post(
  '/',
  protect,
  validate(createAllocationSchema),
  createAllocation
)

router.get(
  '/',
  protect,
  getAllocations
)

router.get(
  '/:allocationId',
  protect,
  validateParams(allocationIdParamSchema),
  getAllocationById
)

router.post(
  '/:allocationId/end',
  protect,
  validateParams(allocationIdParamSchema),
  validate(endAllocationSchema),
  endAllocation
)

export default router