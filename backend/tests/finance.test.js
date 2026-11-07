import test from 'node:test'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { computeLateFee } from '../src/services/lateFeeCalculator.js'
import { buildSettlement } from '../src/services/depositService.js'
import { verifyCheckoutSignature, verifyWebhookSignature } from '../src/services/gatewayService.js'

test('computeLateFee', async (t) => {
  const base = { graceDays: 3, baseAmount: 10000 }
  await t.test('nothing inside the grace days', () => {
    assert.equal(computeLateFee({ ...base, mode: 'FLAT', amount: 200, daysLate: 3 }), 0)
    assert.equal(computeLateFee({ ...base, mode: 'FLAT', amount: 200, daysLate: 0 }), 0)
  })
  await t.test('flat fee once after the grace days', () => {
    assert.equal(computeLateFee({ ...base, mode: 'FLAT', amount: 200, daysLate: 4 }), 200)
    assert.equal(computeLateFee({ ...base, mode: 'FLAT', amount: 200, daysLate: 20 }), 200)
  })
  await t.test('per day grows with every late day', () => {
    assert.equal(computeLateFee({ ...base, mode: 'PER_DAY', amount: 50, daysLate: 4 }), 50)
    assert.equal(computeLateFee({ ...base, mode: 'PER_DAY', amount: 50, daysLate: 8 }), 250)
  })
  await t.test('percent of the rent', () => assert.equal(computeLateFee({ ...base, mode: 'PERCENT', amount: 2, daysLate: 5 }), 200))
  await t.test('the maximum caps it', () => {
    assert.equal(computeLateFee({ ...base, mode: 'PER_DAY', amount: 100, maxAmount: 500, daysLate: 30 }), 500)
    assert.equal(computeLateFee({ ...base, mode: 'PER_DAY', amount: 100, maxAmount: null, daysLate: 6 }), 300)
  })
})

test('buildSettlement', async (t) => {
  const due = (id, month, amount, paidAmount, day) => ({ _id: id, billingMonth: month, amount, paidAmount, dueDate: `2026-${month.slice(5)}-${day}` })

  await t.test('refunds what is left after unpaid rent', () => {
    const r = buildSettlement({ depositAmount: 20000, dues: [due('a', '2026-10', 9000, 0, '05')] })
    assert.equal(r.rentAdjusted, 9000)
    assert.equal(r.refundAmount, 11000)
    assert.equal(r.stillOwed, 0)
  })

  await t.test('deductions come out before rent and reduce the refund', () => {
    const r = buildSettlement({ depositAmount: 20000, dues: [due('a', '2026-10', 9000, 0, '05')], deductions: [{ reason: 'Broken window', amount: 2500 }] })
    assert.equal(r.deductionsTotal, 2500)
    assert.equal(r.refundAmount, 8500)
  })

  await t.test('oldest rent is cleared first when the deposit is not enough', () => {
    const r = buildSettlement({ depositAmount: 12000, dues: [due('new', '2026-11', 9000, 0, '05'), due('old', '2026-10', 9000, 0, '05')] })
    assert.deepEqual(r.adjustments.map((a) => [a.dueId, a.amount, a.fullyCleared]), [['old', 9000, true], ['new', 3000, false]])
    assert.equal(r.refundAmount, 0)
    assert.equal(r.stillOwed, 6000)
  })

  await t.test('part paid rent only takes the balance', () => {
    const r = buildSettlement({ depositAmount: 10000, dues: [due('a', '2026-10', 9000, 4000, '05')] })
    assert.equal(r.unpaidRent, 5000)
    assert.equal(r.refundAmount, 5000)
  })

  await t.test('deductions bigger than the deposit are still owed', () => {
    const r = buildSettlement({ depositAmount: 5000, dues: [], deductions: [{ reason: 'Damage', amount: 8000 }] })
    assert.equal(r.refundAmount, 0)
    assert.equal(r.stillOwed, 3000)
  })
})

test('gateway signatures', async (t) => {
  const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex')

  await t.test('checkout signature must match order|payment signed with the key secret', () => {
    const signature = hmac('secret123', 'order_A|pay_B')
    assert.equal(verifyCheckoutSignature({ orderId: 'order_A', paymentId: 'pay_B', signature, secret: 'secret123' }), true)
    assert.equal(verifyCheckoutSignature({ orderId: 'order_A', paymentId: 'pay_X', signature, secret: 'secret123' }), false)
    assert.equal(verifyCheckoutSignature({ orderId: 'order_A', paymentId: 'pay_B', signature, secret: 'other' }), false)
    assert.equal(verifyCheckoutSignature({ orderId: 'order_A', paymentId: 'pay_B', signature: '', secret: 'secret123' }), false)
  })

  await t.test('webhook signature is checked against the raw body', () => {
    const body = '{"event":"payment.captured"}'
    const signature = hmac('hook', body)
    assert.equal(verifyWebhookSignature({ rawBody: body, signature, secret: 'hook' }), true)
    assert.equal(verifyWebhookSignature({ rawBody: `${body} `, signature, secret: 'hook' }), false)
    assert.equal(verifyWebhookSignature({ rawBody: body, signature, secret: '' }), false)
  })
})
