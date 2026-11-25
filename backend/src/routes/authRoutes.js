import express from 'express'

import {
  setupOwner,
  verifyOwnerSetup,
  login,
  demoLogin,
  getMe,
  logout,
  ownerTest,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js'

import { validate } from '../middlewares/validateMiddleware.js'
import { protect } from '../middlewares/authMiddleware.js'
import { authorizeRoles } from '../middlewares/roleMiddleware.js'
import { rateLimit, byIp, byBodyField, MINUTE, HOUR } from '../middlewares/rateLimit.js'

import {
  setupOwnerSchema,
  verifyOwnerSetupSchema,
  loginSchema,
  demoLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidator.js'

const router = express.Router()

// Limits per network (IP address) and, where it helps, per account. Wrong passwords are also counted
// per account in the login controller.
const loginLimit = rateLimit({ name: 'login-ip', windowMs: 15 * MINUTE, max: 30 })
const demoLimit = rateLimit({ name: 'demo-ip', windowMs: 15 * MINUTE, max: 40 })
const setupLimit = rateLimit({ name: 'setup-ip', windowMs: HOUR, max: 10 })
const forgotIpLimit = rateLimit({ name: 'forgot-ip', windowMs: HOUR, max: 10 })
const forgotEmailLimit = rateLimit({
  name: 'forgot-email',
  windowMs: HOUR,
  max: 3,
  key: byBodyField('email'),
  message: 'A reset link was already sent to this email recently. Please check your inbox and spam folder, or try again in an hour.',
})
const resetLimit = rateLimit({ name: 'reset-ip', windowMs: 15 * MINUTE, max: 10, key: byIp })

router.post(
  '/setup-owner',
  setupLimit,
  validate(setupOwnerSchema),
  setupOwner
)

router.post(
  '/verify-setup',
  setupLimit,
  validate(verifyOwnerSetupSchema),
  verifyOwnerSetup
)

router.post(
  '/login',
  loginLimit,
  validate(loginSchema),
  login
)

router.post(
  '/demo',
  demoLimit,
  validate(demoLoginSchema),
  demoLogin
)

router.post(
  '/forgot-password',
  forgotIpLimit,
  validate(forgotPasswordSchema),
  forgotEmailLimit,
  forgotPassword
)

router.post(
  '/reset-password',
  resetLimit,
  validate(resetPasswordSchema),
  resetPassword
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