import { z } from 'zod'

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    'Invalid ID.'
  )

const typeSchema = z.enum([
  'GENERAL',
  'MAINTENANCE',
  'PAYMENT',
  'FOOD',
  'RULES',
  'EMERGENCY',
  'EVENT',
  'OTHER',
])

const prioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
])

const audienceSchema = z.enum([
  'ALL_TENANTS',
  'PROPERTY_TENANTS',
  'SPECIFIC_TENANT',
  'STAFF',
  'MANAGERS',
])

const statusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'EXPIRED',
  'CANCELLED',
])

const dateSchema = z
  .string()
  .datetime({
    offset: true,
  })

// --------------------------------------------------
// CREATE
// --------------------------------------------------

export const createAnnouncementSchema = z
  .object({
    propertyId: objectIdSchema,

    title: z
      .string()
      .trim()
      .min(1)
      .max(150),

    message: z
      .string()
      .trim()
      .min(1)
      .max(3000),

    type: typeSchema
      .optional()
      .default('GENERAL'),

    priority: prioritySchema
      .optional()
      .default('MEDIUM'),

    audience: audienceSchema,

    targetTenantId: objectIdSchema
      .nullable()
      .optional()
      .default(null),

    expiresAt: dateSchema
      .nullable()
      .optional()
      .default(null),
  })
  .superRefine((data, ctx) => {
    if (
      data.audience === 'SPECIFIC_TENANT' &&
      !data.targetTenantId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetTenantId'],
        message:
          'targetTenantId is required for SPECIFIC_TENANT.',
      })
    }

    if (
      data.audience !== 'SPECIFIC_TENANT' &&
      data.targetTenantId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetTenantId'],
        message:
          'targetTenantId can only be used for SPECIFIC_TENANT.',
      })
    }

    if (data.expiresAt) {
      const expiry = new Date(data.expiresAt)

      if (expiry <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiresAt'],
          message:
            'expiresAt must be in the future.',
        })
      }
    }
  })

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

export const updateAnnouncementSchema =
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1)
        .max(150)
        .optional(),

      message: z
        .string()
        .trim()
        .min(1)
        .max(3000)
        .optional(),

      type: typeSchema.optional(),

      priority: prioritySchema.optional(),

      audience: audienceSchema.optional(),

      targetTenantId: objectIdSchema
        .nullable()
        .optional(),

      expiresAt: dateSchema
        .nullable()
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.targetTenantId !== undefined &&
        !data.targetTenantId
      ) {
        return
      }

      if (
        data.audience === 'SPECIFIC_TENANT' &&
        !data.targetTenantId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetTenantId'],
          message:
            'targetTenantId is required for SPECIFIC_TENANT.',
        })
      }

      if (
        data.audience &&
        data.audience !== 'SPECIFIC_TENANT' &&
        data.targetTenantId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetTenantId'],
          message:
            'targetTenantId can only be used for SPECIFIC_TENANT.',
        })
      }

      if (data.expiresAt) {
        const expiry = new Date(data.expiresAt)

        if (expiry <= new Date()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['expiresAt'],
            message:
              'expiresAt must be in the future.',
          })
        }
      }
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message:
          'At least one field is required.',
      }
    )

// --------------------------------------------------
// PARAMS
// --------------------------------------------------

export const announcementIdParamSchema =
  z.object({
    announcementId: objectIdSchema,
  })

// --------------------------------------------------
// LIST QUERY
// --------------------------------------------------

export const announcementListQuerySchema =
  z.object({
    propertyId: objectIdSchema.optional(),

    type: typeSchema.optional(),

    priority: prioritySchema.optional(),

    audience: audienceSchema.optional(),

    status: statusSchema.optional(),

    createdBy: objectIdSchema.optional(),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),
  })

// --------------------------------------------------
// PUBLISH
// --------------------------------------------------

export const publishAnnouncementSchema =
  z.object({
    expiresAt: dateSchema
      .nullable()
      .optional(),
  })

// --------------------------------------------------
// CANCEL
// --------------------------------------------------

export const cancelAnnouncementSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
  })