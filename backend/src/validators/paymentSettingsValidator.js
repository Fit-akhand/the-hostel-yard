import { z } from 'zod'

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/

export const propertyIdParamSchema =
  z.object({
    propertyId: z
      .string()
      .regex(
        objectIdRegex,
        'Invalid property ID'
      ),
  })

export const createPaymentSettingsSchema =
  z
    .object({
      upiId: z
        .string()
        .trim()
        .min(
          1,
          'UPI ID cannot be empty'
        )
        .max(
          100,
          'UPI ID cannot exceed 100 characters'
        )
        .optional(),

      accountName: z
        .string()
        .trim()
        .min(
          1,
          'Account name cannot be empty'
        )
        .max(
          150,
          'Account name cannot exceed 150 characters'
        )
        .optional(),

      qrImageUrl: z
        .string()
        .trim()
        .max(
          1000,
          'QR image URL cannot exceed 1000 characters'
        )
        .optional(),

      paymentInstructions: z
        .string()
        .trim()
        .min(
          1,
          'Payment instructions cannot be empty'
        )
        .max(
          500,
          'Payment instructions cannot exceed 500 characters'
        )
        .optional(),

      isEnabled: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) =>
        data.upiId !== undefined ||
        data.qrImageUrl !== undefined,
      {
        message:
          'At least a UPI ID or QR image is required.',
      }
    )

export const updatePaymentSettingsSchema =
  z
    .object({
      upiId: z
        .string()
        .trim()
        .min(
          1,
          'UPI ID cannot be empty'
        )
        .max(
          100,
          'UPI ID cannot exceed 100 characters'
        )
        .nullable()
        .optional(),

      accountName: z
        .string()
        .trim()
        .min(
          1,
          'Account name cannot be empty'
        )
        .max(
          150,
          'Account name cannot exceed 150 characters'
        )
        .nullable()
        .optional(),

      qrImageUrl: z
        .string()
        .trim()
        .max(
          1000,
          'QR image URL cannot exceed 1000 characters'
        )
        .nullable()
        .optional(),

      paymentInstructions: z
        .string()
        .trim()
        .min(
          1,
          'Payment instructions cannot be empty'
        )
        .max(
          500,
          'Payment instructions cannot exceed 500 characters'
        )
        .optional(),

      isEnabled: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          'At least one field is required to update payment settings.',
      }
    )