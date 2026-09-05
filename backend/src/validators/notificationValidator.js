import { z } from 'zod'

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/

export const notificationIdParamSchema =
  z.object({
    notificationId: z
      .string()
      .regex(
        objectIdRegex,
        'Invalid notification ID.'
      ),
  })

export const notificationListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    isRead: z
      .enum(['true', 'false'])
      .optional(),

    type: z
      .enum([
        'TENANT_INVITATION',

        'PAYMENT_RECEIVED',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED',

        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',

        'COMPLAINT_CREATED',
        'COMPLAINT_ASSIGNED',
        'COMPLAINT_STATUS_CHANGED',

        'ANNOUNCEMENT',

        'GENERAL',
      ])
      .optional(),
  })