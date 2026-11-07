import express from 'express'
import { z } from 'zod'
import { protect } from '../middlewares/authMiddleware.js'
import { validate } from '../middlewares/validateMiddleware.js'
import { getReceipt } from '../services/receiptService.js'
import * as deposits from '../services/depositService.js'

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const send = (res, data, message, status = 200) => res.status(status).json({ success: true, message, data })
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res) } catch (error) { next(error) } }

export const receiptRouter = express.Router()
receiptRouter.get('/:paymentId', protect, wrap(async (req, res) => {
  if (!id.safeParse(req.params.paymentId).success) return res.status(400).json({ success: false, message: 'Invalid payment id.' })
  send(res, { receipt: await getReceipt({ user: req.user, paymentId: req.params.paymentId }) })
}))

const depositBody = z.object({
  amount: z.number().int().min(1).max(10_000_000),
  receivedOn: dateText,
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().trim().max(300).optional().nullable(),
}).strict()
const deductions = z.array(z.object({ reason: z.string().trim().min(2).max(200), amount: z.number().int().min(1).max(10_000_000) })).max(20)
const settleBody = z.object({
  deductions: deductions.default([]),
  refundMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  settledOn: dateText.optional(),
}).strict()

export const depositRouter = express.Router()
depositRouter.use(protect)
depositRouter.get('/', wrap(async (req, res) => send(res, { deposits: await deposits.listDeposits({ user: req.user, propertyId: req.query.propertyId }) })))
depositRouter.get('/tenant/:tenantId', wrap(async (req, res) => send(res, { deposit: await deposits.getTenantDeposit({ user: req.user, tenantId: req.params.tenantId }) })))
depositRouter.put('/tenant/:tenantId', validate(depositBody), wrap(async (req, res) => send(res, { deposit: await deposits.saveDeposit({ user: req.user, tenantId: req.params.tenantId, data: req.body }) }, 'Deposit saved.')))
// A preview changes nothing, so it is a GET (the demo guests, who are read-only, can use it too).
depositRouter.get('/tenant/:tenantId/preview', wrap(async (req, res) => {
  let raw = []
  try { raw = req.query.deductions ? JSON.parse(String(req.query.deductions)) : [] } catch { /* handled by validation below */ }
  const parsed = deductions.safeParse(raw)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid deductions.' })
  send(res, await deposits.previewSettlement({ user: req.user, tenantId: req.params.tenantId, deductions: parsed.data }))
}))
depositRouter.post('/tenant/:tenantId/settle', validate(settleBody), wrap(async (req, res) => send(res, { deposit: await deposits.settleDeposit({ user: req.user, tenantId: req.params.tenantId, ...req.body }) }, 'Deposit settled.')))
