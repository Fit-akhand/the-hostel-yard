import express from 'express'

import {
  getNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js'

import {
  protect,
} from '../middlewares/authMiddleware.js'

import {
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from '../validators/notificationValidator.js'

const router =
  express.Router()

// --------------------------------------------------
// CURRENT USER NOTIFICATIONS
// --------------------------------------------------

router.get(
  '/',
  protect,
  validateQuery(
    notificationListQuerySchema
  ),
  getNotifications
)

// --------------------------------------------------
// UNREAD COUNT
// Keep before /:notificationId
// --------------------------------------------------

router.get(
  '/unread-count',
  protect,
  getUnreadCount
)

// --------------------------------------------------
// MARK ALL READ
// Keep before /:notificationId
// --------------------------------------------------

router.patch(
  '/read-all',
  protect,
  markAllAsRead
)

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

router.get(
  '/:notificationId',
  protect,
  validateParams(
    notificationIdParamSchema
  ),
  getNotificationById
)

// --------------------------------------------------
// MARK ONE READ
// --------------------------------------------------

router.patch(
  '/:notificationId/read',
  protect,
  validateParams(
    notificationIdParamSchema
  ),
  markAsRead
)

// --------------------------------------------------
// DELETE ONE
// --------------------------------------------------

router.delete(
  '/:notificationId',
  protect,
  validateParams(
    notificationIdParamSchema
  ),
  deleteNotification
)

export default router