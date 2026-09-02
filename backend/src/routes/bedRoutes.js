import express from 'express'

import {
  createBed,
  getBedsByRoom,
  getBedById,
  updateBed,
  deactivateBed,
} from '../controllers/bedController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  roomIdParamSchema,
  bedIdParamSchema,
  createBedSchema,
  updateBedSchema,
  bedListQuerySchema,
} from '../validators/bedValidator.js'

const router = express.Router()

// -----------------------------------------------
// GET BEDS OF ROOM
// -----------------------------------------------

router.get(
  '/room/:roomId',
  protect,
  validateParams(roomIdParamSchema),
  validateQuery(
    bedListQuerySchema
  ),
  getBedsByRoom
)

// -----------------------------------------------
// CREATE BED
// -----------------------------------------------

router.post(
  '/room/:roomId',
  protect,
  validateParams(roomIdParamSchema),
  validate(createBedSchema),
  createBed
)

// -----------------------------------------------
// GET BED BY ID
// -----------------------------------------------

router.get(
  '/:bedId',
  protect,
  validateParams(bedIdParamSchema),
  getBedById
)

// -----------------------------------------------
// UPDATE BED
// -----------------------------------------------

router.put(
  '/:bedId',
  protect,
  validateParams(bedIdParamSchema),
  validate(updateBedSchema),
  updateBed
)

// -----------------------------------------------
// DEACTIVATE BED
// -----------------------------------------------

router.delete(
  '/:bedId',
  protect,
  validateParams(bedIdParamSchema),
  deactivateBed
)

export default router