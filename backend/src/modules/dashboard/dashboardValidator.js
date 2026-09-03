import { z } from 'zod'

const objectIdRegex = /^[0-9a-fA-F]{24}$/

export const dashboardQuerySchema = z.object({
  propertyId: z
    .string()
    .regex(objectIdRegex, 'Invalid property ID.')
    .optional(),
})