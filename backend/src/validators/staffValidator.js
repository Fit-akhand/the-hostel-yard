import { z } from 'zod'

import { STAFF_ALLOWED_PERMISSIONS } from '../constants/staffPermissions.js'

const objectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    'Invalid ID.'
  )

const permissionsSchema = z
  .array(
    z.string()
  )
  .min(
    1,
    'At least one permission is required.'
  )
  .superRefine((permissions, ctx) => {
    const invalidPermissions =
      permissions.filter(
        (permission) =>
          !STAFF_ALLOWED_PERMISSIONS.includes(
            permission
          )
      )

    if (invalidPermissions.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'One or more permissions are not allowed for staff.',
      })
    }
  })

export const createStaffSchema = z.object({
  propertyId: objectId,

  staffName: z
    .string()
    .trim()
    .min(
      2,
      'Staff name must be at least 2 characters.'
    )
    .max(
      100,
      'Staff name cannot exceed 100 characters.'
    ),

  phone: z
    .string()
    .trim()
    .min(
      10,
      'Enter a valid phone number.'
    )
    .max(
      15,
      'Enter a valid phone number.'
    ),

  email: z
    .string()
    .trim()
    .email(
      'Enter a valid email address.'
    )
    .transform((value) =>
      value.toLowerCase()
    )
    .optional()
    .or(z.literal('')),

  designation: z
    .string()
    .trim()
    .min(
      2,
      'Designation must be at least 2 characters.'
    )
    .max(
      100,
      'Designation cannot exceed 100 characters.'
    ),

  permissions: permissionsSchema,

  joiningDate: z
    .coerce
    .date({
      message: 'Enter a valid joining date.',
    })
    .optional(),

  notes: z
    .string()
    .trim()
    .max(
      1000,
      'Notes cannot exceed 1000 characters.'
    )
    .optional(),
})

export const staffIdParamSchema = z.object({
  staffId: objectId,
})

export const updateStaffSchema = z
  .object({
    designation: z
      .string()
      .trim()
      .min(
        2,
        'Designation must be at least 2 characters.'
      )
      .max(
        100,
        'Designation cannot exceed 100 characters.'
      )
      .optional(),

    permissions: permissionsSchema.optional(),

    joiningDate: z
      .coerce
      .date({
        message: 'Enter a valid joining date.',
      })
      .nullable()
      .optional(),

    notes: z
      .string()
      .trim()
      .max(
        1000,
        'Notes cannot exceed 1000 characters.'
      )
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        'At least one field is required to update staff.',
    }
  )

export const staffStatusSchema = z.object({
  status: z.enum(
    ['ACTIVE', 'SUSPENDED', 'REMOVED'],
    {
      message: 'Invalid staff status.',
    }
  ),
})

export const staffListQuerySchema = z.object({
  propertyId: objectId.optional(),

  status: z
    .enum(
      ['ACTIVE', 'SUSPENDED', 'REMOVED', 'ALL']
    )
    .default('ACTIVE'),

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

export const activateStaffSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required.'),
  password: z.string().min(8).max(128),
})