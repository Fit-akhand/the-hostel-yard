import { z } from 'zod'

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID')

const categorySchema = z.enum([
  'ELECTRICAL',
  'PLUMBING',
  'CLEANING',
  'FURNITURE',
  'AC',
  'WIFI',
  'SECURITY',
  'MAINTENANCE',
  'OTHER',
])

const prioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
])

const statusSchema = z.enum([
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])

/*
|--------------------------------------------------------------------------
| Params
|--------------------------------------------------------------------------
*/

export const complaintIdParamSchema = z.object({
  complaintId: objectIdSchema,
})

/*
|--------------------------------------------------------------------------
| Create complaint
|--------------------------------------------------------------------------
|
| Tenant:
|   property / room / bed are derived from ACTIVE allocation.
|
| Manager / Owner:
|   property / tenant / room / bed may be supplied.
|
*/

export const createComplaintSchema = z.object({
  propertyId: objectIdSchema.optional(),

  tenantId: objectIdSchema.optional(),

  roomId: objectIdSchema.optional(),

  bedId: objectIdSchema.optional(),

  title: z
    .string()
    .trim()
    .min(3, 'Complaint title must be at least 3 characters.')
    .max(150, 'Complaint title cannot exceed 150 characters.'),

  description: z
    .string()
    .trim()
    .min(5, 'Complaint description must be at least 5 characters.')
    .max(2000, 'Complaint description cannot exceed 2000 characters.'),

  category: categorySchema,

  priority: prioritySchema.optional(),
})

/*
|--------------------------------------------------------------------------
| Update complaint
|--------------------------------------------------------------------------
*/

export const updateComplaintSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(150)
      .optional(),

    description: z
      .string()
      .trim()
      .min(5)
      .max(2000)
      .optional(),

    category: categorySchema.optional(),

    priority: prioritySchema.optional(),

    status: statusSchema.optional(),

    assignedTo: objectIdSchema.nullable().optional(),

    resolutionNotes: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required.',
    }
  )

/*
|--------------------------------------------------------------------------
| Complaint list filters
|--------------------------------------------------------------------------
*/

export const complaintListQuerySchema = z.object({
  propertyId: objectIdSchema.optional(),

  tenantId: objectIdSchema.optional(),

  roomId: objectIdSchema.optional(),

  bedId: objectIdSchema.optional(),

  status: statusSchema.optional(),

  priority: prioritySchema.optional(),

  category: categorySchema.optional(),

  assignedTo: objectIdSchema.optional(),
})

export const assignComplaintSchema = z.object({
  assignedTo: objectIdSchema,
})

export const changeComplaintStatusSchema = z.object({
  status: statusSchema,

  resolutionNotes: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
})