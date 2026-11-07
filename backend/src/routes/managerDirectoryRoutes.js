import express from 'express'
import { z } from 'zod'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import * as svc from '../services/managerDirectoryService.js'

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
const phone = z.string().trim().min(10, 'Enter a valid phone number').max(15, 'Enter a valid phone number')
const permissions = z.array(z.string()).min(1, 'Choose at least one permission')

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: phone.optional(),
  email: z.string().trim().toLowerCase().email().optional(),
}).strict()
const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).strict()
const assignSchema = z.object({ propertyId: id, permissions }).strict()

const send = (res, data, message) => res.status(200).json({ success: true, message, data })
const wrap = (fn) => async (req, res, next) => {
  try {
    if (req.params.managerId && !id.safeParse(req.params.managerId).success) return res.status(400).json({ success: false, message: 'Invalid manager id.' })
    if (req.params.invitationId && !id.safeParse(req.params.invitationId).success) return res.status(400).json({ success: false, message: 'Invalid id.' })
    await fn(req, res)
  } catch (error) { next(error) }
}

// Owner-only directory of managers. Mounted before the older invitation routes on /api/managers.
const router = express.Router()
router.use(protect, authorizeRoles('BUSINESS_OWNER'))

router.get('/', wrap(async (req, res) => send(res, await svc.listManagers({ owner: req.user }))))
router.delete('/invitations/:invitationId', wrap(async (req, res) => send(res, await svc.cancelInvitation({ owner: req.user, invitationId: req.params.invitationId }), 'Invitation cancelled.')))
router.get('/:managerId', wrap(async (req, res) => send(res, { manager: await svc.getManager({ owner: req.user, managerId: req.params.managerId }) })))
router.put('/:managerId', validate(profileSchema), wrap(async (req, res) => send(res, { manager: await svc.updateManagerProfile({ owner: req.user, managerId: req.params.managerId, data: req.body }) }, 'Manager updated.')))
router.patch('/:managerId/status', validate(statusSchema), wrap(async (req, res) => send(res, { manager: await svc.setManagerStatus({ owner: req.user, managerId: req.params.managerId, status: req.body.status }) }, 'Manager status updated.')))
router.post('/:managerId/properties', validate(assignSchema), wrap(async (req, res) => send(res, { manager: await svc.assignManagerToProperty({ owner: req.user, managerId: req.params.managerId, ...req.body }) }, 'Property assigned.')))
router.delete('/:managerId/properties/:propertyId', wrap(async (req, res) => {
  if (!id.safeParse(req.params.propertyId).success) return res.status(400).json({ success: false, message: 'Invalid property id.' })
  send(res, { manager: await svc.removeManagerFromProperty({ owner: req.user, managerId: req.params.managerId, propertyId: req.params.propertyId }) }, 'Manager removed from property.')
}))

export default router
