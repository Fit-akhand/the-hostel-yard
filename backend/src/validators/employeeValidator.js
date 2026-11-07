import { z } from 'zod'
import { ATTENDANCE_STATUSES } from '../models/Attendance.js'

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
const monthText = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM')
const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

const employeeBody = {
  propertyId: id,
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  designation: z.string().trim().min(2).max(60),
  payType: z.enum(['MONTHLY', 'DAILY']).default('MONTHLY'),
  salary: z.number().min(0).max(10_000_000),
  weeklyOff: z.number().int().min(0).max(6).nullable().optional(),
  joinDate: dateText,
}

export const createEmployeeSchema = z.object(employeeBody).strict()
export const updateEmployeeSchema = z.object(employeeBody).partial().strict()

export const employeeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'LEFT']),
  leftDate: dateText.optional(),
}).strict()

export const employeeListQuerySchema = z.object({
  propertyId: id.optional(),
  status: z.enum(['ACTIVE', 'LEFT']).optional(),
})

export const attendanceSheetQuerySchema = z.object({ propertyId: id, date: dateText })

export const saveAttendanceSchema = z.object({
  propertyId: id,
  date: dateText,
  entries: z.array(z.object({
    employeeId: id,
    status: z.enum(ATTENDANCE_STATUSES).nullable(),
    note: z.string().trim().max(200).optional().nullable(),
  })).min(1).max(500),
}).strict()

export const monthAttendanceQuerySchema = z.object({ employeeId: id, month: monthText })

export const createAdjustmentSchema = z.object({
  employeeId: id,
  type: z.enum(['ADVANCE', 'DEDUCTION', 'BONUS']),
  amount: z.number().int().min(1).max(10_000_000),
  reason: z.string().trim().max(200).optional().nullable(),
  date: dateText,
  month: monthText.optional(),
}).strict()

export const adjustmentListQuerySchema = z.object({ employeeId: id.optional(), month: monthText.optional() })

export const generatePayrollSchema = z.object({ month: monthText, propertyId: id.optional() }).strict()
export const payrollListQuerySchema = z.object({ month: monthText, propertyId: id.optional() })

export const payPayrollSchema = z.object({
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  reference: z.string().trim().max(100).optional().nullable(),
  paidOn: dateText.optional(),
}).strict()

export const idParamSchema = z.object({ id })
