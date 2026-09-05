import {
  getNotifications as getNotificationsService,
  getUnreadNotificationCount,
  getNotificationById as getNotificationByIdService,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationService,
} from '../services/notificationService.js'

// --------------------------------------------------
// GET MY NOTIFICATIONS
// --------------------------------------------------

export const getNotifications =
  async (req, res, next) => {
    try {
      const result =
        await getNotificationsService({
          user: req.user,
          query: req.query,
        })

      res.status(200).json({
        success: true,
        ...result,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

export const getNotificationById =
  async (req, res, next) => {
    try {
      const notification =
        await getNotificationByIdService({
          user: req.user,

          notificationId:
            req.params
              .notificationId,
        })

      res.status(200).json({
        success: true,
        notification,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// UNREAD COUNT
// --------------------------------------------------

export const getUnreadCount =
  async (req, res, next) => {
    try {
      const unreadCount =
        await getUnreadNotificationCount(
          {
            user: req.user,
          }
        )

      res.status(200).json({
        success: true,
        unreadCount,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// MARK ONE READ
// --------------------------------------------------

export const markAsRead =
  async (req, res, next) => {
    try {
      const notification =
        await markNotificationAsRead({
          user: req.user,

          notificationId:
            req.params
              .notificationId,
        })

      res.status(200).json({
        success: true,

        message:
          'Notification marked as read.',

        notification,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// MARK ALL READ
// --------------------------------------------------

export const markAllAsRead =
  async (req, res, next) => {
    try {
      const result =
        await markAllNotificationsAsRead(
          {
            user: req.user,
          }
        )

      res.status(200).json({
        success: true,

        message:
          'All notifications marked as read.',

        modifiedCount:
          result.modifiedCount,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// DELETE
// --------------------------------------------------

export const deleteNotification =
  async (req, res, next) => {
    try {
      await deleteNotificationService({
        user: req.user,

        notificationId:
          req.params
            .notificationId,
      })

      res.status(200).json({
        success: true,

        message:
          'Notification deleted successfully.',
      })
    } catch (error) {
      next(error)
    }
  }