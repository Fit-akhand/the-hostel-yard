import { z } from 'zod'

// --------------------------------------------------
// EXPENSE ID
// --------------------------------------------------

export const expenseIdParamSchema = z.object({
  expenseId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid expense ID'
    ),
})

// --------------------------------------------------
// PROPERTY ID
// --------------------------------------------------

export const propertyIdParamSchema = z.object({
  propertyId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid property ID'
    ),
})

// --------------------------------------------------
// CREATE EXPENSE
// --------------------------------------------------

export const createExpenseSchema = z.object({
  propertyId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid property ID'
    ),

  category: z.enum([
    'ELECTRICITY',
    'WATER',
    'INTERNET',
    'FOOD',
    'MAINTENANCE',
    'SALARY',
    'CLEANING',
    'SUPPLIES',
    'TAX',
    'MARKETING',
    'OTHER',
  ], {
    message: 'Invalid expense category',
  }),

  amount: z
    .number()
    .positive(
      'Expense amount must be greater than 0'
    ),

  paymentMethod: z.enum([
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'CARD',
    'OTHER',
  ], {
    message: 'Invalid payment method',
  }),

  expenseDate: z.coerce.date(),

  description: z
    .string()
    .trim()
    .max(
      500,
      'Description cannot exceed 500 characters'
    )
    .optional()
    .nullable(),

  receiptUrl: z
    .string()
    .trim()
    .max(
      1000,
      'Receipt URL cannot exceed 1000 characters'
    )
    .optional()
    .nullable(),
})

// --------------------------------------------------
// UPDATE EXPENSE
// --------------------------------------------------

export const updateExpenseSchema = z
  .object({
    category: z
      .enum([
        'ELECTRICITY',
        'WATER',
        'INTERNET',
        'FOOD',
        'MAINTENANCE',
        'SALARY',
        'CLEANING',
        'SUPPLIES',
        'TAX',
        'MARKETING',
        'OTHER',
      ], {
        message: 'Invalid expense category',
      })
      .optional(),

    amount: z
      .number()
      .positive(
        'Expense amount must be greater than 0'
      )
      .optional(),

    paymentMethod: z
      .enum([
        'CASH',
        'UPI',
        'BANK_TRANSFER',
        'CARD',
        'OTHER',
      ], {
        message: 'Invalid payment method',
      })
      .optional(),

    expenseDate: z.coerce.date().optional(),

    description: z
      .string()
      .trim()
      .max(
        500,
        'Description cannot exceed 500 characters'
      )
      .optional()
      .nullable(),

    receiptUrl: z
      .string()
      .trim()
      .max(
        1000,
        'Receipt URL cannot exceed 1000 characters'
      )
      .optional()
      .nullable(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'At least one field is required to update the expense.',
    }
  )

// --------------------------------------------------
// VOID EXPENSE
// --------------------------------------------------

export const voidExpenseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(
      1,
      'Void reason is required'
    )
    .max(
      500,
      'Void reason cannot exceed 500 characters'
    ),
})

// --------------------------------------------------
// EXPENSE LIST QUERY
// --------------------------------------------------

export const expenseListQuerySchema = z.object({
  propertyId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid property ID'
    )
    .optional(),

  category: z
    .enum([
      'ELECTRICITY',
      'WATER',
      'INTERNET',
      'FOOD',
      'MAINTENANCE',
      'SALARY',
      'CLEANING',
      'SUPPLIES',
      'TAX',
      'MARKETING',
      'OTHER',
    ])
    .optional(),

  paymentMethod: z
    .enum([
      'CASH',
      'UPI',
      'BANK_TRANSFER',
      'CARD',
      'OTHER',
    ])
    .optional(),

  status: z
    .enum([
      'ACTIVE',
      'VOIDED',
    ])
    .optional(),

  startDate: z.coerce.date().optional(),

  endDate: z.coerce.date().optional(),
})