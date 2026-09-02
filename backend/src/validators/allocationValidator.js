import { z } from 'zod'

const objectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    'Invalid ID'
  )

export const allocationIdParamSchema =
  z.object({
    allocationId: objectId,
  })

export const createAllocationSchema =
  z.object({
    tenantId: objectId,

    bedId: objectId,

    startDate: z.coerce.date({
      message: 'Enter a valid start date',
    }),

    notes: z
      .string()
      .trim()
      .max(
        500,
        'Notes cannot exceed 500 characters'
      )
      .optional()
      .or(z.literal('')),
  })

export const endAllocationSchema =
  z.object({
    endDate: z.coerce.date({
      message: 'Enter a valid end date',
    }),
  })