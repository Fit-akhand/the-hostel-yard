import { z } from 'zod'

export const roomIdParamSchema = z.object({
  roomId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid room ID'
    ),
})

export const bedIdParamSchema = z.object({
  bedId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid bed ID'
    ),
})

export const createBedSchema = z.object({
  bedNumber: z
    .string()
    .trim()
    .min(1, 'Bed number is required')
    .max(
      50,
      'Bed number cannot exceed 50 characters'
    ),
})

export const updateBedSchema = z
  .object({
    bedNumber: z
      .string()
      .trim()
      .min(1, 'Bed number is required')
      .max(
        50,
        'Bed number cannot exceed 50 characters'
      )
      .optional(),

    status: z
      .enum([
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'INACTIVE',
      ])
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'At least one field is required to update the bed.',
    }
  )

export const bedListQuerySchema = z.object({
  status: z
    .enum([
      'AVAILABLE',
      'OCCUPIED',
      'MAINTENANCE',
      'INACTIVE',
    ])
    .optional(),
})