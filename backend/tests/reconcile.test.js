import test from 'node:test'
import assert from 'node:assert/strict'
import { extractCredits, parseCsv, toNumber } from '../../frontend/src/utils/bankStatement.js'
import { matchPayments } from '../../frontend/src/utils/reconcile.js'

// Shaped like an HDFC CSV: quoted amounts with commas, a narration that contains the UTR.
const HDFC = `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/11/26,"UPI-ASHA SHARMA-9876543210@YBL-HDFC0000001-312345678901-RENT",0000312345678901,01/11/26,,"9,500.00","1,09,500.00"
02/11/26,"UPI-RAHUL VERMA-RAHUL@OKAXIS-SBIN0001234-312345678902-RENT NOV",0000312345678902,02/11/26,,"8,000.00","1,17,500.00"
03/11/26,"NEFT DR-ELECTRICITY BOARD",N123,03/11/26,"4,200.00",,"1,13,300.00"
04/11/26,"UPI-UNKNOWN PERSON-X@OKHDFC-HDFC0000001-999999999999-HI",0000999999999999,04/11/26,,"1,000.00","1,14,300.00"
`

test('parseCsv', async (t) => {
  await t.test('keeps commas inside quotes and drops empty lines', () => {
    const rows = parseCsv('a,"b,c",d\n\n"x ""y""",2,3\r\n')
    assert.deepEqual(rows, [['a', 'b,c', 'd'], ['x "y"', '2', '3']])
  })
  await t.test('toNumber understands Indian formatting', () => {
    assert.equal(toNumber('1,09,500.00'), 109500)
    assert.equal(toNumber('₹ 9,500'), 9500)
    assert.equal(toNumber(''), 0)
  })
})

test('extractCredits', async (t) => {
  await t.test('returns only money that came in', () => {
    const credits = extractCredits(parseCsv(HDFC))
    assert.equal(credits.length, 3)
    assert.deepEqual(credits.map((c) => c.amount), [9500, 8000, 1000])
  })
  await t.test('finds the header even with lines above it', () => {
    const credits = extractCredits(parseCsv(`Account Statement\nCustomer: X\n\n${HDFC}`))
    assert.equal(credits.length, 3)
  })
  await t.test('works with a single amount column and a Dr/Cr marker', () => {
    const csv = 'Date,Description,Amount,Dr/Cr\n01/11/26,UPI-A-111111111111,5000,Cr\n02/11/26,ATM,2000,Dr\n'
    assert.deepEqual(extractCredits(parseCsv(csv)).map((c) => c.amount), [5000])
  })
  await t.test('explains a file it cannot read', () => {
    assert.throws(() => extractCredits(parseCsv('hello,world\n1,2')), /column headings/)
  })
})

test('matchPayments', async (t) => {
  const credits = extractCredits(parseCsv(HDFC))
  const pay = (id, ref, amount) => ({ _id: id, transactionReference: ref, amount })

  await t.test('matches by UTR and amount', () => {
    const { results } = matchPayments({ credits, payments: [pay('a', '312345678901', 9500)] })
    assert.equal(results[0].status, 'MATCH')
  })
  await t.test('flags a different amount', () => {
    const { results } = matchPayments({ credits, payments: [pay('b', '312345678902', 9000)] })
    assert.equal(results[0].status, 'MISMATCH')
    assert.equal(results[0].credit.amount, 8000)
  })
  await t.test('reports a UTR that is not on the statement', () => {
    const { results } = matchPayments({ credits, payments: [pay('c', '555555555555', 9500)] })
    assert.equal(results[0].status, 'NOT_FOUND')
  })
  await t.test('one bank credit can only settle one payment', () => {
    const { results } = matchPayments({ credits, payments: [pay('d', '312345678901', 9500), pay('e', '312345678901', 9500)] })
    assert.deepEqual(results.map((r) => r.status), ['MATCH', 'NOT_FOUND'])
  })
  await t.test('lists credits nobody claimed', () => {
    const { unclaimed } = matchPayments({ credits, payments: [pay('a', '312345678901', 9500), pay('b', '312345678902', 8000)] })
    assert.deepEqual(unclaimed.map((c) => c.amount), [1000])
  })
  await t.test('ignores references that are too short to be trusted', () => {
    const { results } = matchPayments({ credits, payments: [pay('f', '123', 9500)] })
    assert.equal(results[0].status, 'NOT_FOUND')
  })
})
