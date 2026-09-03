import { z } from 'zod'

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID.')

const dateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())

export const createBookingSchema = z
  .object({
    propertyId: objectId,
    tenantId: objectId,
    roomId: objectId,
    bedId: objectId,

    bookingDate: dateString.optional(),

    expectedMoveInDate: dateString,

    expectedMoveOutDate: dateString.nullable().optional(),

    amount: z
      .number()
      .min(0, 'Amount cannot be negative.')
      .optional(),

    paymentStatus: z
      .enum(['UNPAID', 'PARTIAL', 'PAID'])
      .optional(),

    notes: z
      .string()
      .trim()
      .max(2000, 'Notes cannot exceed 2000 characters.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    const moveIn = new Date(data.expectedMoveInDate)

    if (Number.isNaN(moveIn.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedMoveInDate'],
        message: 'Invalid expected move-in date.',
      })
      return
    }

    if (data.expectedMoveOutDate) {
      const moveOut = new Date(data.expectedMoveOutDate)

      if (Number.isNaN(moveOut.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expectedMoveOutDate'],
          message: 'Invalid expected move-out date.',
        })
      } else if (moveOut <= moveIn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expectedMoveOutDate'],
          message: 'Expected move-out date must be after move-in date.',
        })
      }
    }
  })

export const updateBookingSchema = z
  .object({
    expectedMoveInDate: dateString.optional(),

    expectedMoveOutDate: dateString.nullable().optional(),

    amount: z
      .number()
      .min(0, 'Amount cannot be negative.')
      .optional(),

    paymentStatus: z
      .enum(['UNPAID', 'PARTIAL', 'PAID'])
      .optional(),

    notes: z
      .string()
      .trim()
      .max(2000, 'Notes cannot exceed 2000 characters.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.expectedMoveInDate === undefined &&
      data.expectedMoveOutDate === undefined &&
      data.amount === undefined &&
      data.paymentStatus === undefined &&
      data.notes === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required for update.',
      })

      return
    }

    if (data.expectedMoveInDate && data.expectedMoveOutDate) {
      const moveIn = new Date(data.expectedMoveInDate)
      const moveOut = new Date(data.expectedMoveOutDate)

      if (moveOut <= moveIn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expectedMoveOutDate'],
          message: 'Expected move-out date must be after move-in date.',
        })
      }
    }
  })

export const bookingIdParamsSchema = z.object({
  id: objectId,
})

export const listBookingsQuerySchema = z.object({
  propertyId: objectId.optional(),
  tenantId: objectId.optional(),
  roomId: objectId.optional(),
  bedId: objectId.optional(),

  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'EXPIRED',
      'COMPLETED',
    ])
    .optional(),

  paymentStatus: z
    .enum(['UNPAID', 'PARTIAL', 'PAID'])
    .optional(),

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
})

export const confirmBookingSchema = z.object({
  id: objectId,
})

export const cancelBookingSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(1000, 'Cancellation reason cannot exceed 1000 characters.')
    .optional(),
})

export const completeBookingSchema = z.object({
  id: objectId,
})