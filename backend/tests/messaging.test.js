import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone } from '../src/messaging/phone.js'
import { TEMPLATES } from '../src/messaging/templates.js'
import { sendOnChannel } from '../src/messaging/messenger.js'
import { reminderKind } from '../src/jobs/dailyJobs.js'
import { updateNotificationSettingsSchema } from '../src/validators/notificationSettingsValidator.js'

test('normalizePhone', async (t) => {
  await t.test('adds +91 to a 10 digit Indian mobile', () => assert.equal(normalizePhone('98765 43210'), '+919876543210'))
  await t.test('keeps a number that already has the country code', () => assert.equal(normalizePhone('919876543210'), '+919876543210'))
  await t.test('accepts an international number with +', () => assert.equal(normalizePhone('+14155238886'), '+14155238886'))
  await t.test('rejects imported placeholder numbers', () => assert.equal(normalizePhone('0000000001'), null))
  await t.test('rejects empty and short values', () => {
    assert.equal(normalizePhone(''), null)
    assert.equal(normalizePhone('12345'), null)
  })
})

test('reminderKind', async (t) => {
  const rent = { daysBefore: [3, 1], onDueDay: true, overdueEveryDays: 3 }
  await t.test('reminds 3 and 1 days before', () => {
    assert.equal(reminderKind(3, rent), 'RENT_REMINDER')
    assert.equal(reminderKind(1, rent), 'RENT_REMINDER')
    assert.equal(reminderKind(2, rent), null)
  })
  await t.test('reminds on the due day unless switched off', () => {
    assert.equal(reminderKind(0, rent), 'RENT_REMINDER')
    assert.equal(reminderKind(0, { ...rent, onDueDay: false }), null)
  })
  await t.test('overdue: first day, then every N days', () => {
    assert.equal(reminderKind(-1, rent), 'RENT_OVERDUE')
    assert.equal(reminderKind(-2, rent), null)
    assert.equal(reminderKind(-3, rent), 'RENT_OVERDUE')
    assert.equal(reminderKind(-6, rent), 'RENT_OVERDUE')
  })
})

test('templates mention the key facts', () => {
  const reminder = TEMPLATES.RENT_REMINDER({ name: 'Asha', balance: 9500, billingMonth: '2026-11', property: 'Lotus PG', daysLeft: 3, dueDate: '2026-11-05' })
  assert.match(reminder.body, /Asha/)
  assert.match(reminder.body, /9,500/)
  assert.match(reminder.body, /due in 3 days/)
  const overdue = TEMPLATES.RENT_OVERDUE({ name: 'Asha', balance: 9500, billingMonth: '2026-11', property: 'Lotus PG', daysOverdue: 1, dueDate: '2026-11-05' })
  assert.match(overdue.body, /1 day overdue/)
})

test('sendOnChannel skips instead of failing for bad addresses', async () => {
  assert.equal((await sendOnChannel({ channel: 'SMS', to: '0000000001', body: 'hi' })).status, 'SKIPPED')
  assert.equal((await sendOnChannel({ channel: 'EMAIL', to: 'not-an-email', body: 'hi' })).status, 'SKIPPED')
})

test('updateNotificationSettingsSchema', async (t) => {
  await t.test('accepts a partial update', () => assert.ok(updateNotificationSettingsSchema.safeParse({ channels: { whatsapp: true }, rent: { daysBefore: [2] } }).success))
  await t.test('rejects unknown keys and bad values', () => {
    assert.equal(updateNotificationSettingsSchema.safeParse({ nope: true }).success, false)
    assert.equal(updateNotificationSettingsSchema.safeParse({ rent: { overdueEveryDays: 0 } }).success, false)
  })
})

test('tenant UPI payment validation', async (t) => {
  const { createTenantPaymentSchema } = await import('../src/validators/tenantPaymentValidator.js')
  const base = { rentDueId: 'a'.repeat(24), amount: 9500, method: 'UPI', paymentDate: '2026-11-05' }
  await t.test('accepts a 12 digit UTR', () => assert.ok(createTenantPaymentSchema.safeParse({ ...base, transactionReference: '312345678901' }).success))
  await t.test('rejects short, long and non-numeric references', () => {
    for (const ref of ['12345', '1234567890123', 'abcdefghijkl', '3123 4567 8901']) {
      assert.equal(createTenantPaymentSchema.safeParse({ ...base, transactionReference: ref }).success, false, ref)
    }
  })
  await t.test('the owner alert template names the tenant, amount and UTR', async () => {
    const { TEMPLATES } = await import('../src/messaging/templates.js')
    const m = TEMPLATES.PAYMENT_RECEIVED({ name: 'Asha', amount: 9500, billingMonth: '2026-11', property: 'Lotus PG', reference: '312345678901' })
    assert.match(m.body, /Asha/)
    assert.match(m.body, /312345678901/)
    assert.match(m.body, /9,500/)
  })
})
