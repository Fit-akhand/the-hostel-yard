import { z } from 'zod'

export const createRoomSchema = z.object({
  propertyId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid property ID'
    ),

  roomNumber: z
    .string()
    .trim()
    .min(1, 'Room number is required')
    .max(
      20,
      'Room number cannot exceed 20 characters'
    ),

  floor: z
    .number({
      message: 'Floor must be a number',
    })
    .int('Floor must be a whole number')
    .min(0, 'Floor cannot be negative'),

  type: z.enum(
    [
      'SINGLE',
      'DOUBLE',
      'TRIPLE',
      'DORMITORY',
    ],
    {
      message: 'Invalid room type',
    }
  ),

  capacity: z
    .number({
      message: 'Capacity must be a number',
    })
    .int('Capacity must be a whole number')
    .min(
      1,
      'Capacity must be at least 1'
    )
    .max(
      100,
      'Capacity cannot exceed 100'
    ),
})

export const roomIdParamSchema = z.object({
  roomId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid room ID'
    ),
})

export const updateRoomSchema = z
  .object({
    roomNumber: z
      .string()
      .trim()
      .min(1, 'Room number is required')
      .max(
        20,
        'Room number cannot exceed 20 characters'
      )
      .optional(),

    floor: z
      .number({
        message: 'Floor must be a number',
      })
      .int('Floor must be a whole number')
      .min(0, 'Floor cannot be negative')
      .optional(),

    type: z
      .enum(
        [
          'SINGLE',
          'DOUBLE',
          'TRIPLE',
          'DORMITORY',
        ],
        {
          message: 'Invalid room type',
        }
      )
      .optional(),

    capacity: z
      .number({
        message: 'Capacity must be a number',
      })
      .int('Capacity must be a whole number')
      .min(
        1,
        'Capacity must be at least 1'
      )
      .max(
        100,
        'Capacity cannot exceed 100'
      )
      .optional(),

    status: z
      .enum([
        'ACTIVE',
        'MAINTENANCE',
        'INACTIVE',
      ], {
        message: 'Invalid room status',
      })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'At least one field is required to update the room.',
    }
  )

export const roomListQuerySchema = z.object({
  propertyId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid property ID'
    )
    .optional(),

  status: z
    .enum([
      'ACTIVE',
      'MAINTENANCE',
      'INACTIVE',
      'ALL',
    ])
    .default('ACTIVE'),
})