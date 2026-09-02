import express from 'express'

import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deactivateRoom,
} from '../controllers/roomController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createRoomSchema,
  roomIdParamSchema,
  updateRoomSchema,
  roomListQuerySchema,
} from '../validators/roomValidator.js'

const router = express.Router()

router.post(
  '/',
  protect,
  validate(createRoomSchema),
  createRoom
)

router.get(
  '/',
  protect,
  validateQuery(roomListQuerySchema),
  getRooms
)

router.get(
  '/:roomId',
  protect,
  validateParams(roomIdParamSchema),
  getRoomById
)

router.put(
  '/:roomId',
  protect,
  validateParams(roomIdParamSchema),
  validate(updateRoomSchema),
  updateRoom
)

router.delete(
  '/:roomId',
  protect,
  validateParams(roomIdParamSchema),
  deactivateRoom
)

export default router