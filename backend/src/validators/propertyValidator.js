import { z } from 'zod'

export const createPropertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Property name must be at least 2 characters')
    .max(150, 'Property name cannot exceed 150 characters'),

  type: z.enum([
    'PG',
    'HOSTEL',
    'HOTEL',
    'FLAT',
    'OTHER',
  ]),

  address: z
    .string()
    .trim()
    .min(5, 'Address is required')
    .max(300, 'Address cannot exceed 300 characters'),

  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .max(100, 'City cannot exceed 100 characters'),

  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(100, 'State cannot exceed 100 characters'),

  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
})

export const updatePropertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Property name must be at least 2 characters')
    .max(150, 'Property name cannot exceed 150 characters')
    .optional(),

  type: z
    .enum([
      'PG',
      'HOSTEL',
      'HOTEL',
      'FLAT',
      'OTHER',
    ])
    .optional(),

  address: z
    .string()
    .trim()
    .min(5, 'Address is required')
    .max(300, 'Address cannot exceed 300 characters')
    .optional(),

  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .max(100, 'City cannot exceed 100 characters')
    .optional(),

  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(100, 'State cannot exceed 100 characters')
    .optional(),

  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional(),
})