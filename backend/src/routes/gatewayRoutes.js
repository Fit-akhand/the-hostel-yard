import express from 'express'
import { z } from 'zod'
import { protect } from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import {
  confirmGatewayPayment, createGatewayOrder, getGatewayConfig, handleWebhook, verifyWebhookSignature,
} from '../services/gatewayService.js'

const router = express.Router()
const id = z.string().regex(/^[a-f\d]{24}$/i)

router.get('/config', protect, (_req, res) => res.status(200).json({ success: true, data: getGatewayConfig() }))

router.post('/orders', protect, validate(z.object({ rentDueId: id }).strict()), async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await createGatewayOrder({ user: req.user, rentDueId: req.body.rentDueId }) })
  } catch (error) { next(error) }
})

router.post('/confirm', protect, validate(z.object({ orderId: z.string().min(5), paymentId: z.string().min(5), signature: z.string().min(10) }).strict()), async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Payment received.', data: await confirmGatewayPayment({ user: req.user, ...req.body }) })
  } catch (error) { next(error) }
})

// No login: Razorpay calls this. The signature on the raw body is the proof it is really Razorpay.
router.post('/webhook', async (req, res, next) => {
  try {
    if (!verifyWebhookSignature({ rawBody: req.rawBody?.toString('utf8'), signature: req.headers['x-razorpay-signature'] })) {
      return res.status(401).json({ success: false, message: 'Invalid signature.' })
    }
    res.status(200).json({ success: true, data: await handleWebhook(req.body) })
  } catch (error) { next(error) }
})

export default router
