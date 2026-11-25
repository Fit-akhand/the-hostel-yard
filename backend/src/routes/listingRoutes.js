import express from 'express'
import { z } from 'zod'

import { protect } from '../middlewares/authMiddleware.js'
import { validate, validateParams } from '../middlewares/validateMiddleware.js'
import { handle, idParam } from '../utils/http.js'
import { getListings, saveListing } from '../services/listingService.js'

const router = express.Router()
router.use(protect)

const rent = z.union([z.coerce.number().min(0).max(1000000), z.literal(''), z.null()]).optional()

const saveSchema = z.object({
  published: z.boolean(),
  slug: z.string().trim().max(60).optional(),
  audience: z.enum(['BOYS', 'GIRLS', 'ANY']).optional(),
  headline: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  amenities: z.array(z.string().max(40)).max(30).optional(),
  rentFrom: z.object({ SINGLE: rent, DOUBLE: rent, TRIPLE: rent, DORMITORY: rent }).partial().optional(),
  contactPhone: z.string().trim().max(20).optional(),
  showFoodMenu: z.boolean().optional(),
  mapUrl: z.string().trim().max(500).optional(),
}).strict()

router.get('/', handle((req) => getListings(req.user)))

router.put(
  '/:propertyId',
  validateParams(idParam('propertyId')),
  validate(saveSchema),
  handle((req) => saveListing({ user: req.user, propertyId: req.params.propertyId, data: req.body }), { message: 'Public page saved.' })
)

export default router
