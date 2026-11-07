import crypto from 'node:crypto'
import GatewayOrder from '../models/GatewayOrder.js'
import Payment from '../models/Payment.js'
import RentDue from '../models/RentDue.js'
import Tenant from '../models/Tenant.js'
import Organization from '../models/Organization.js'
import { nextReceiptNumber } from './receiptNumber.js'
import { notifyPaymentOutcome } from './eventMessaging.js'

// Online rent payments through Razorpay Checkout. Switched on only when RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET are set; RAZORPAY_WEBHOOK_SECRET additionally lets Razorpay confirm payments
// the browser never reported (closed tab, lost network).

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export const isGatewayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex')

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// Signature Razorpay Checkout returns to the browser: HMAC_SHA256("<order_id>|<payment_id>", key_secret).
export const verifyCheckoutSignature = ({ orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET }) =>
  Boolean(secret) && safeEqual(hmac(secret, `${orderId}|${paymentId}`), signature)

// Signature on webhook calls: HMAC_SHA256(raw request body, webhook_secret).
export const verifyWebhookSignature = ({ rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET }) =>
  Boolean(secret) && Boolean(rawBody) && safeEqual(hmac(secret, rawBody), signature)

export const getGatewayConfig = () => ({ enabled: isGatewayEnabled(), keyId: isGatewayEnabled() ? process.env.RAZORPAY_KEY_ID : null })

const razorpay = async (method, path, body) => {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw fail(data.error?.description || 'The payment provider rejected the request.', 502)
  return data
}

const tenantOf = async (user) => {
  if (user.role !== 'TENANT') throw fail('Only tenants can pay rent online.', 403)
  const tenant = await Tenant.findOne({ user: user._id, organization: user.organization })
  if (!tenant) throw fail('Tenant profile not found.', 404)
  return tenant
}

// The amount is always what is still owed on the due, worked out here, never sent by the browser.
export const createGatewayOrder = async ({ user, rentDueId }) => {
  if (!isGatewayEnabled()) throw fail('Online payment is not available.', 503)
  const tenant = await tenantOf(user)
  const due = await RentDue.findOne({ _id: rentDueId, organization: user.organization, tenant: tenant._id })
  if (!due) throw fail('Rent due not found.', 404)

  const remaining = due.amount - due.paidAmount
  if (due.status === 'PAID' || remaining <= 0) throw fail('This rent is already paid.', 409)

  const order = await razorpay('POST', '/orders', {
    amount: Math.round(remaining * 100),
    currency: 'INR',
    receipt: `due_${String(due._id).slice(-12)}_${Date.now().toString(36)}`,
    notes: { rentDueId: String(due._id), tenantId: String(tenant._id) },
  })

  await GatewayOrder.create({
    organization: user.organization, property: due.property, tenant: tenant._id, rentDue: due._id,
    orderId: order.id, amount: remaining,
  })

  const org = await Organization.findById(user.organization).select('name').lean()
  return { orderId: order.id, amount: remaining, amountPaise: order.amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, name: org?.name || 'The Hostel Yard', description: `Rent ${due.billingMonth}`, prefill: { name: tenant.name, contact: tenant.phone } }
}

// Records a captured gateway payment exactly once, however many times it is reported (browser + webhook).
export const recordGatewayPayment = async ({ orderId, paymentId }) => {
  const order = await GatewayOrder.findOneAndUpdate({ orderId, status: 'CREATED' }, { $set: { status: 'PAID', paymentId } }, { new: true })
  if (!order) return GatewayOrder.findOne({ orderId }).populate('payment') // unknown order, or already recorded

  const [due, tenant, org] = await Promise.all([
    RentDue.findById(order.rentDue), Tenant.findById(order.tenant), Organization.findById(order.organization).select('owner').lean(),
  ])
  const actor = tenant?.user || org?.owner

  const payment = await Payment.create({
    organization: order.organization, property: order.property, tenant: order.tenant, rentDue: order.rentDue,
    amount: order.amount, method: 'ONLINE', status: 'VERIFIED', paymentDate: new Date(), transactionReference: paymentId,
    notes: 'Paid online (Razorpay)', recordedBy: actor, verifiedBy: actor, verifiedAt: new Date(),
    receiptNumber: await nextReceiptNumber(order.organization),
  })

  due.paidAmount = Math.min(due.amount, due.paidAmount + order.amount)
  due.status = due.paidAmount >= due.amount ? 'PAID' : 'PARTIAL'
  await due.save()

  order.payment = payment._id
  await order.save()
  await notifyPaymentOutcome(payment, 'VERIFIED')
  return order
}

// Called by the browser after Checkout succeeds.
export const confirmGatewayPayment = async ({ user, orderId, paymentId, signature }) => {
  const tenant = await tenantOf(user)
  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) throw fail('Payment verification failed.', 400)

  const order = await GatewayOrder.findOne({ orderId, tenant: tenant._id })
  if (!order) throw fail('Payment order not found.', 404)

  const recorded = await recordGatewayPayment({ orderId, paymentId })
  return { status: 'PAID', paymentId: recorded?.payment?._id || recorded?.payment || null }
}

// Called by Razorpay (server to server).
export const handleWebhook = async (event) => {
  const entity = event?.payload?.payment?.entity
  if (!['payment.captured', 'order.paid'].includes(event?.event) || !entity?.order_id || !entity?.id) return { handled: false }
  await recordGatewayPayment({ orderId: entity.order_id, paymentId: entity.id })
  return { handled: true }
}
