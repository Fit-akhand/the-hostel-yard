import { z } from 'zod'

export const acceptTenantInvitationSchema =
  z.object({
    token: z
      .string()
      .min(
        20,
        'Invalid invitation token'
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