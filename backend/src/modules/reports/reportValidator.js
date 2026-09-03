import { z } from 'zod'

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/

const dateRegex =
  /^\d{4}-\d{2}-\d{2}$/

export const reportQuerySchema =
  z.object({
    propertyId: z
      .string()
      .regex(
        objectIdRegex,
        'Invalid property ID.'
      )
      .optional(),

    startDate: z
      .string()
      .regex(
        dateRegex,
        'Invalid start date.'
      )
      .optional(),

    endDate: z
      .string()
      .regex(
        dateRegex,
        'Invalid end date.'
      )
      .optional(),
  })