import { z } from 'zod'

export const setupOwnerSchema = z.object({
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
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),

  organizationName: z
    .string()
    .trim()
    .min(2, 'Organization name is required')
    .max(150, 'Organization name cannot exceed 150 characters'),
})

export const verifyOtpSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Phone or email is required'),

  otp: z
    .string()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),

  purpose: z.enum([
    'SETUP_OWNER',
    'LOGIN',
    'PHONE_VERIFICATION',
    'PASSWORD_RESET',
    'INVITATION',
  ]),
})

export const verifyOwnerSetupSchema = z.object({
  verificationId: z
    .string()
    .min(1, 'Verification ID is required'),

  otp: z
    .string()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
})

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Phone or email is required'),

  password: z
    .string()
    .min(1, 'Password is required'),
})

export const forgotPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(
        'Enter a valid email address'
      )
      .transform((value) =>
        value.toLowerCase()
      ),
  })

  export const resetPasswordSchema =
  z.object({
    token: z
      .string()
      .min(
        20,
        'Invalid reset token'
      ),

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
  })