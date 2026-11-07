import express from 'express'
import { z } from 'zod'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { getFinanceSettings, updateFinanceSettings } from '../controllers/financeSettingsController.js'

const updateSchema = z.object({
  lateFee: z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(['FLAT', 'PER_DAY', 'PERCENT']).optional(),
    amount: z.number().min(0).max(100000).optional(),
    graceDays: z.number().int().min(0).max(30).optional(),
    maxAmount: z.number().min(0).max(1000000).nullable().optional(),
  }).strict(),
}).strict()

const router = express.Router()
router.get('/', protect, authorizeRoles('BUSINESS_OWNER'), getFinanceSettings)
router.put('/', protect, authorizeRoles('BUSINESS_OWNER'), validate(updateSchema), updateFinanceSettings)
export default router
