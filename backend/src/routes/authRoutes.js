import express from 'express'

import {
  setupOwner,
  verifyOwnerSetup,
  login,
  getMe,
  logout,
  ownerTest,
} from '../controllers/authController.js'

import { validate } from '../middlewares/validateMiddleware.js'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'

import {
  setupOwnerSchema,
  verifyOwnerSetupSchema,
  loginSchema,
} from '../validators/authValidator.js'

const router = express.Router()

router.post(
  '/setup-owner',
  validate(setupOwnerSchema),
  setupOwner
)

router.post(
  '/verify-setup',
  validate(verifyOwnerSetupSchema),
  verifyOwnerSetup
)

router.post(
  '/login',
  validate(loginSchema),
  login
)

router.get('/me', protect, getMe)

router.post('/logout', protect, logout)

router.get(
  '/owner-test',
  protect,
  authorizeRoles('BUSINESS_OWNER'),
  ownerTest
)

export default router