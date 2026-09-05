import mongoose from 'mongoose'

import Notification from '../models/Notification.js'
import User from '../models/User.js'

// --------------------------------------------------
// ERROR HELPER
// --------------------------------------------------

const createError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// --------------------------------------------------
// OBJECT ID
// --------------------------------------------------

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

// --------------------------------------------------
// CREATE ONE NOTIFICATION
// --------------------------------------------------

export const createNotification =
  async ({
    recipient,
    organization,
    property = null,
    type = 'GENERAL',
    title,
    message,
    data = {},
    createdBy = null,
    session = null,
  }) => {
    console.log('🔥 createNotifications FUNCTION CALLED')
    if (!recipient) {
      throw createError(
        'Notification recipient is required.',
        400
      )
    }

    if (!organization) {
      throw createError(
        'Notification organization is required.',
        400
      )
    }

    if (!title?.trim()) {
      throw createError(
        'Notification title is required.',
        400
      )
    }

    if (!message?.trim()) {
      throw createError(
        'Notification message is required.',
        400
      )
    }

    if (!isValidObjectId(recipient)) {
      throw createError(
        'Invalid notification recipient.',
        400
      )
    }

    if (!isValidObjectId(organization)) {
      throw createError(
        'Invalid notification organization.',
        400
      )
    }

    const user = await User.findOne({
      _id: recipient,
      organization,
    })
      .select('_id organization status')
      .session(session)

    if (!user) {
      throw createError(
        'Notification recipient not found.',
        404
      )
    }

    const [notification] =
      await Notification.create(
        [
          {
            organization,
            recipient,
            property,
            type,
            title: title.trim(),
            message: message.trim(),
            data,
            createdBy,
          },
        ],
        {
          session,
        }
      )

    return notification
  }

// --------------------------------------------------
// CREATE MANY NOTIFICATIONS
// --------------------------------------------------

export const createNotifications = async ({
  recipients,
  organization,
  property = null,
  type = 'GENERAL',
  title,
  message,
  data = {},
  createdBy = null,
  session = null,
}) => {
  console.log('========== CREATE NOTIFICATIONS ==========')
  console.log('recipients:', recipients)
  console.log('organization:', organization)
  console.log('property:', property)
  console.log('type:', type)

  if (!Array.isArray(recipients) || !recipients.length) {
    console.log('❌ RETURN: recipients empty')
    return []
  }

  if (!organization) {
    throw createError(
      'Notification organization is required.',
      400
    )
  }

  const uniqueRecipientIds = [
  ...new Set(
    recipients
      .filter(Boolean)
      .map((id) => id.toString())
  ),
]

if (!uniqueRecipientIds.length) {
  return []
}

const recipientObjectIds = uniqueRecipientIds.map(
  (id) => new mongoose.Types.ObjectId(id)
)

const organizationObjectId = new mongoose.Types.ObjectId(
  organization.toString()
)

const users = await User.find({
  _id: {
    $in: recipientObjectIds,
  },
  organization: organizationObjectId,
})
  .select('_id name email')
  .session(session)

if (!users.length) {
  return []
}

  const notifications = users.map((user) => ({
    organization,
    recipient: user._id,
    property,
    type,
    title: title.trim(),
    message: message.trim(),
    data,
    createdBy,
  }))

  console.log('NOTIFICATIONS TO INSERT:', notifications)

  const result = await Notification.insertMany(
    notifications,
    {
      session,
    }
  )

  console.log('✅ INSERT RESULT:', result)

  return result
}

// --------------------------------------------------
// GET MY NOTIFICATIONS
// --------------------------------------------------

export const getNotifications =
  async ({
    user,
    query = {},
  }) => {
    if (!user?.organization) {
      throw createError(
        'User organization not found.',
        400
      )
    }

    const page =
      Number(query.page) || 1

    const limit =
      Number(query.limit) || 20

    const skip =
      (page - 1) * limit

    const filter = {
      organization:
        user.organization,

      recipient:
        user._id,
    }

    if (
      query.isRead !== undefined
    ) {
      filter.isRead =
        query.isRead === true ||
        query.isRead === 'true'
    }

    if (query.type) {
      filter.type = query.type
    }

    const [
      notifications,
      total,
      unreadCount,
    ] = await Promise.all([
      Notification.find(filter)
        .populate(
          'property',
          'name city state'
        )
        .populate(
          'createdBy',
          'name email role'
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Notification.countDocuments(
        filter
      ),

      Notification.countDocuments({
        organization:
          user.organization,

        recipient:
          user._id,

        isRead: false,
      }),
    ])

    return {
      notifications,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },

      unreadCount,
    }
  }

// --------------------------------------------------
// GET UNREAD COUNT
// --------------------------------------------------

export const getUnreadNotificationCount =
  async ({ user }) => {
    const count =
      await Notification.countDocuments(
        {
          organization:
            user.organization,

          recipient:
            user._id,

          isRead: false,
        }
      )

    return count
  }

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

export const getNotificationById =
  async ({
    user,
    notificationId,
  }) => {
    if (
      !isValidObjectId(
        notificationId
      )
    ) {
      throw createError(
        'Invalid notification ID.',
        400
      )
    }

    const notification =
      await Notification.findOne({
        _id: notificationId,

        organization:
          user.organization,

        recipient:
          user._id,
      })
        .populate(
          'property',
          'name city state'
        )
        .populate(
          'createdBy',
          'name email role'
        )

    if (!notification) {
      throw createError(
        'Notification not found.',
        404
      )
    }

    return notification
  }

// --------------------------------------------------
// MARK ONE READ
// --------------------------------------------------

export const markNotificationAsRead =
  async ({
    user,
    notificationId,
  }) => {
    if (
      !isValidObjectId(
        notificationId
      )
    ) {
      throw createError(
        'Invalid notification ID.',
        400
      )
    }

    const notification =
      await Notification.findOne({
        _id: notificationId,

        organization:
          user.organization,

        recipient:
          user._id,
      })

    if (!notification) {
      throw createError(
        'Notification not found.',
        404
      )
    }

    if (!notification.isRead) {
      notification.isRead = true

      notification.readAt =
        new Date()

      await notification.save()
    }

    return notification
  }

// --------------------------------------------------
// MARK ALL READ
// --------------------------------------------------

export const markAllNotificationsAsRead =
  async ({ user }) => {
    const now =
      new Date()

    const result =
      await Notification.updateMany(
        {
          organization:
            user.organization,

          recipient:
            user._id,

          isRead: false,
        },

        {
          $set: {
            isRead: true,
            readAt: now,
          },
        }
      )

    return {
      modifiedCount:
        result.modifiedCount,
    }
  }

// --------------------------------------------------
// DELETE ONE
// --------------------------------------------------

export const deleteNotification =
  async ({
    user,
    notificationId,
  }) => {
    if (
      !isValidObjectId(
        notificationId
      )
    ) {
      throw createError(
        'Invalid notification ID.',
        400
      )
    }

    const notification =
      await Notification.findOneAndDelete({
        _id: notificationId,

        organization:
          user.organization,

        recipient:
          user._id,
      })

    if (!notification) {
      throw createError(
        'Notification not found.',
        404
      )
    }

    return notification
  }

// --------------------------------------------------
// DELETE OLD NOTIFICATIONS
// Internal maintenance helper
// --------------------------------------------------

export const deleteOldNotifications =
  async ({
    beforeDate,
  }) => {
    if (!beforeDate) {
      throw createError(
        'Before date is required.',
        400
      )
    }

    return Notification.deleteMany({
      createdAt: {
        $lt: beforeDate,
      },

      isRead: true,
    })
  }