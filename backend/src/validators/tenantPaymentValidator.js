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

    // A UPI reference (UTR) is always 12 digits. GPay, PhonePe, Paytm and every bank show the same number.
    transactionReference: z
      .string()
      .trim()
      .regex(
        /^\d{12}$/,
        'Enter the 12 digit UPI reference number (UTR) from your payment app'
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