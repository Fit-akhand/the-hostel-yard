import { z } from 'zod'

export const createManagerInvitationSchema =
  z.object({
    managerName: z
      .string()
      .trim()
      .min(2, 'Manager name is required')
      .max(100, 'Manager name cannot exceed 100 characters'),

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
      .optional(),

    propertyId: z
      .string()
      .min(1, 'Property is required'),

    permissions: z
      .array(z.string())
      .min(1, 'Select at least one permission'),
  })

  export const activateManagerSchema =
  z.object({
    password: z
      .string()
      .min(
        8,
        'Password must be at least 8 characters'
      )
      .max(
        100,
        'Password cannot exceed 100 characters'
      ),

    confirmPassword: z
      .string()
      .min(
        8,
        'Confirm password is required'
      ),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  )

  export const updateManagerPermissionsSchema = z.object({
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required'),
})