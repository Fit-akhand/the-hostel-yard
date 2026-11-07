// Matches payments tenants submitted (waiting for verification) against the credits on a bank statement.
//
//  MATCH     the payment's UTR is on the statement and the amount is the same.
//  MISMATCH  the UTR is on the statement but the amount is different. Needs a human look.
//  NOT_FOUND the UTR is not on the statement (not credited yet, wrong UTR, or wrong statement period).
//
// Statement credits that match no payment come back too: they are money in that nobody has claimed yet.

const digits = (value) => String(value ?? '').replace(/\D/g, '')

export const matchPayments = ({ credits, payments }) => {
  const used = new Set()

  const results = payments.map((payment) => {
    const utr = digits(payment.transactionReference)
    const index = utr.length >= 6
      ? credits.findIndex((c, i) => !used.has(i) && digits(`${c.narration} ${c.ref}`).includes(utr))
      : -1

    if (index < 0) return { payment, status: 'NOT_FOUND', credit: null }

    used.add(index)
    const credit = credits[index]
    return { payment, status: Math.abs(credit.amount - payment.amount) < 0.5 ? 'MATCH' : 'MISMATCH', credit }
  })

  return { results, unclaimed: credits.filter((_, i) => !used.has(i)) }
}
