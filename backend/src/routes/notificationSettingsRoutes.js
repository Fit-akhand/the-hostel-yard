import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { updateNotificationSettingsSchema, testMessageSchema } from '../validators/notificationSettingsValidator.js'
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestMessage,
  runRemindersNow,
  getMessageLogs,
} from '../controllers/notificationSettingsController.js'

const router = express.Router()
const owner = [protect, authorizeRoles('BUSINESS_OWNER')]

router.get('/', ...owner, getNotificationSettings)
router.put('/', ...owner, validate(updateNotificationSettingsSchema), updateNotificationSettings)
router.post('/test', ...owner, validate(testMessageSchema), sendTestMessage)
router.post('/run-now', ...owner, runRemindersNow)
router.get('/logs', ...owner, getMessageLogs)

export default router
