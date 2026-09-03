import { z } from 'zod'

export const createRentPlanSchema = z.object({
  tenantId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid tenant ID'
    ),

  allocationId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid allocation ID'
    ),

  monthlyRent: z
    .number({
      message: 'Monthly rent must be a number',
    })
    .positive('Monthly rent must be greater than 0'),

  dueDay: z
    .number({
      message: 'Due day must be a number',
    })
    .int()
    .min(1)
    .max(28),

  startDate: z.coerce.date({
    message: 'Enter a valid start date',
  }),

  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('')),
})

export const rentPlanIdParamSchema = z.object({
  rentPlanId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid rent plan ID'
    ),
})

export const rentDueIdParamSchema = z.object({
  rentDueId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid rent due ID'
    ),
})

export const generateRentDueSchema = z.object({
  billingMonth: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])$/,
      'Billing month must be in YYYY-MM format'
    ),
})
