import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams } from '../middlewares/validateMiddleware.js'
import { handle, idParam } from '../utils/http.js'
import { getMenuForStaff, saveMenu } from '../services/foodMenuService.js'
import { MENU_DAYS, MENU_MEALS } from '../models/FoodMenu.js'

const router = express.Router()
router.use(protect)

const saveSchema = z.object({
  meals: z.array(z.enum(MENU_MEALS)).min(1).max(4).optional(),
  timings: z.object(Object.fromEntries(MENU_MEALS.map((m) => [m, z.string().trim().max(40).optional()]))).partial().optional(),
  entries: z.array(z.object({
    day: z.enum(MENU_DAYS),
    meal: z.enum(MENU_MEALS),
    items: z.string().max(200),
  })).max(28).optional(),
  note: z.string().max(300).optional(),
  notifyTenants: z.boolean().optional(),
}).strict()

router.get('/:propertyId', validateParams(idParam('propertyId')), handle((req) => getMenuForStaff({ user: req.user, propertyId: req.params.propertyId })))

router.put(
  '/:propertyId',
  validateParams(idParam('propertyId')),
  validate(saveSchema),
  handle((req) => saveMenu({ user: req.user, propertyId: req.params.propertyId, data: req.body }), { message: 'Food menu saved.' })
)

export default router
