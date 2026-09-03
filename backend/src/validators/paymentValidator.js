import { z } from 'zod'

export const paymentIdParamSchema = z.object({
  paymentId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid payment ID'
    ),
})

export const createPaymentSchema = z
  .object({
    rentDueId: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        'Invalid rent due ID'
      ),

    amount: z
      .number()
      .positive(
        'Payment amount must be greater than 0'
      ),

    method: z.enum(
      ['CASH', 'UPI'],
      {
        message:
          'Payment method must be CASH or UPI',
      }
    ),

    transactionReference: z
      .string()
      .trim()
      .max(
        100,
        'Transaction reference cannot exceed 100 characters'
      )
      .optional()
      .nullable(),

    paymentDate: z.coerce.date(),

    notes: z
      .string()
      .trim()
      .max(
        500,
        'Notes cannot exceed 500 characters'
      )
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.method === 'UPI' &&
      !data.transactionReference
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['transactionReference'],
        message:
          'Transaction reference is required for UPI payments',
      })
    }

    if (
      data.method === 'CASH' &&
      data.transactionReference
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['transactionReference'],
        message:
          'Transaction reference is not allowed for cash payments',
      })
    }
  })

export const paymentListQuerySchema = z.object({
  status: z
    .enum([
      'PENDING',
      'VERIFIED',
      'REJECTED',
    ])
    .optional(),

  method: z
    .enum([
      'CASH',
      'UPI',
    ])
    .optional(),

  tenantId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid tenant ID'
    )
    .optional(),

  rentDueId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid rent due ID'
    )
    .optional(),
})

export const rejectPaymentSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(
      500,
      'Notes cannot exceed 500 characters'
    )
    .optional(),
})

export const tenantPaymentHistoryQuerySchema = z.object({
  tenantId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID')
    .optional(),

  status: z
    .enum(['PENDING', 'VERIFIED', 'REJECTED'])
    .optional(),

  method: z
    .enum(['CASH', 'UPI'])
    .optional(),
})