import { z } from 'zod'

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/

export const createTenantPaymentSchema =
  z.object({
    rentDueId: z
      .string()
      .regex(
        objectIdRegex,
        'Invalid rent due ID'
      ),

    amount: z
      .number()
      .positive(
        'Payment amount must be greater than zero'
      ),

    method: z
      .literal('UPI'),

    transactionReference: z
      .string()
      .trim()
      .min(
        1,
        'Transaction reference is required for UPI payments'
      )
      .max(
        100,
        'Transaction reference cannot exceed 100 characters'
      ),

    paymentDate: z
      .string()
      .datetime()
      .or(
        z.string().date()
      ),

    notes: z
      .string()
      .trim()
      .max(
        500,
        'Notes cannot exceed 500 characters'
      )
      .optional(),
  })