import { z } from 'zod'

export const createTenantSchema = z.object({

    propertyId: z
  .string()
  .min(1, 'Property is required'),

  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),

  phone: z
    .string()
    .trim()
    .min(10, 'Enter a valid phone number')
    .max(15, 'Enter a valid phone number'),

  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .transform((value) => value.toLowerCase())
    .optional()
    .or(z.literal('')),

  gender: z.enum(
    ['MALE', 'FEMALE', 'OTHER'],
    {
      message: 'Invalid gender',
    }
  ),

  emergencyContact: z
    .object({
      name: z
        .string()
        .trim()
        .max(
          100,
          'Emergency contact name cannot exceed 100 characters'
        )
        .optional(),

      phone: z
        .string()
        .trim()
        .min(10, 'Enter a valid emergency contact phone')
        .max(15, 'Enter a valid emergency contact phone')
        .optional(),

      relationship: z
        .string()
        .trim()
        .max(
          50,
          'Relationship cannot exceed 50 characters'
        )
        .optional(),
    })
    .optional(),

  address: z
    .string()
    .trim()
    .max(
      300,
      'Address cannot exceed 300 characters'
    )
    .optional(),

  moveInDate: z
    .coerce
    .date({
      message: 'Enter a valid move-in date',
    }),
})

export const tenantIdParamSchema = z.object({
  tenantId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid tenant ID'
    ),
})

export const updateTenantSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),

    phone: z
      .string()
      .trim()
      .min(10, 'Enter a valid phone number')
      .max(15, 'Enter a valid phone number')
      .optional(),

    email: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .transform((value) => value.toLowerCase())
      .optional()
      .or(z.literal('')),

    gender: z
      .enum(
        ['MALE', 'FEMALE', 'OTHER'],
        {
          message: 'Invalid gender',
        }
      )
      .optional(),

    emergencyContact: z
      .object({
        name: z
          .string()
          .trim()
          .max(
            100,
            'Emergency contact name cannot exceed 100 characters'
          )
          .optional(),

        phone: z
          .string()
          .trim()
          .min(10, 'Enter a valid emergency contact phone')
          .max(15, 'Enter a valid emergency contact phone')
          .optional(),

        relationship: z
          .string()
          .trim()
          .max(
            50,
            'Relationship cannot exceed 50 characters'
          )
          .optional(),
      })
      .optional(),

    address: z
      .string()
      .trim()
      .max(
        300,
        'Address cannot exceed 300 characters'
      )
      .optional(),

    moveInDate: z
      .coerce
      .date({
        message: 'Enter a valid move-in date',
      })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required to update the tenant.',
    }
  )

export const tenantNoticeSchema = z.object({
  expectedMoveOutDate: z.coerce.date({
    message: 'Enter a valid expected move-out date',
  }),
})

export const tenantMoveOutSchema = z.object({
  actualMoveOutDate: z.coerce.date({
    message: 'Enter a valid move-out date',
  }),
})

export const tenantListQuerySchema = z.object({
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
      'NOTICE_PERIOD',
      'LEFT',
      'ALL',
    ])
    .default('ACTIVE'),
})