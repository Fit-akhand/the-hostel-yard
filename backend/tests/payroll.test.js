import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePayroll, daysInMonth } from '../src/services/payrollCalculator.js'

const monthly = { payType: 'MONTHLY', salary: 30000, joinDate: '2026-01-01', leftDate: null, weeklyOff: null }
const day = (n) => `2026-11-${String(n).padStart(2, '0')}`

test('daysInMonth handles month lengths and leap years', () => {
  assert.equal(daysInMonth('2026-11'), 30)
  assert.equal(daysInMonth('2026-02'), 28)
  assert.equal(daysInMonth('2028-02'), 29)
})

test('monthly salary', async (t) => {
  await t.test('full pay when nothing is marked', () => {
    const r = calculatePayroll({ employee: monthly, month: '2026-11' })
    assert.equal(r.grossPay, 30000)
    assert.equal(r.payableDays, 30)
    assert.equal(r.netPay, 30000)
  })

  await t.test('an absent day loses one day of pay and a half day loses half', () => {
    const r = calculatePayroll({ employee: monthly, month: '2026-11', records: [{ date: day(3), status: 'ABSENT' }, { date: day(10), status: 'HALF_DAY' }] })
    assert.equal(r.absentDays, 1)
    assert.equal(r.halfDays, 1)
    assert.equal(r.payableDays, 28.5)
    assert.equal(r.grossPay, 28500)
  })

  await t.test('paid leave and weekly off are paid', () => {
    const r = calculatePayroll({ employee: { ...monthly, weeklyOff: 0 }, month: '2026-11', records: [{ date: day(4), status: 'PAID_LEAVE' }] })
    assert.equal(r.weeklyOffs, 5) // five Sundays in November 2026
    assert.equal(r.grossPay, 30000)
  })

  await t.test('joining mid month pays only the days since joining', () => {
    const r = calculatePayroll({ employee: { ...monthly, joinDate: day(16) }, month: '2026-11' })
    assert.equal(r.payableDays, 15)
    assert.equal(r.grossPay, 15000)
  })

  await t.test('leaving mid month stops the pay at the last day', () => {
    const r = calculatePayroll({ employee: { ...monthly, leftDate: day(10) }, month: '2026-11' })
    assert.equal(r.payableDays, 10)
    assert.equal(r.grossPay, 10000)
  })

  await t.test('nothing is owed for a month before joining', () => {
    const r = calculatePayroll({ employee: { ...monthly, joinDate: '2026-12-01' }, month: '2026-11' })
    assert.equal(r.grossPay, 0)
  })
})

test('daily wage pays only marked days', () => {
  const employee = { payType: 'DAILY', salary: 500, joinDate: '2026-01-01', leftDate: null, weeklyOff: null }
  const records = [
    { date: day(1), status: 'PRESENT' }, { date: day(2), status: 'PRESENT' },
    { date: day(3), status: 'HALF_DAY' }, { date: day(4), status: 'PAID_LEAVE' }, { date: day(5), status: 'ABSENT' },
  ]
  const r = calculatePayroll({ employee, month: '2026-11', records })
  assert.equal(r.payableDays, 3.5)
  assert.equal(r.grossPay, 1750)
})

test('bonus, deductions and advance recovery', async (t) => {
  const adjustments = [{ type: 'BONUS', amount: 1000 }, { type: 'DEDUCTION', amount: 500 }]

  await t.test('net = gross + bonus - deductions - advance', () => {
    const r = calculatePayroll({ employee: monthly, month: '2026-11', adjustments, advanceBalance: 4000 })
    assert.equal(r.bonus, 1000)
    assert.equal(r.deductions, 500)
    assert.equal(r.advanceRecovered, 4000)
    assert.equal(r.netPay, 30000 + 1000 - 500 - 4000)
  })

  await t.test('an advance is never recovered beyond what is left to pay', () => {
    const r = calculatePayroll({ employee: { ...monthly, salary: 3000 }, month: '2026-11', advanceBalance: 10000 })
    assert.equal(r.advanceRecovered, 3000)
    assert.equal(r.netPay, 0)
  })

  await t.test('no negative recovery for a negative balance', () => {
    assert.equal(calculatePayroll({ employee: monthly, month: '2026-11', advanceBalance: -50 }).advanceRecovered, 0)
  })
})
