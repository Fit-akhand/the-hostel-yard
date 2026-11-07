// Pure late-fee maths. `daysLate` is the number of days past the due date.
// FLAT     : one fixed fee once the grace days are over.
// PER_DAY  : the fee for every day beyond the grace days.
// PERCENT  : a percentage of the rent, once, after the grace days.
// The result is rounded to whole rupees and never above `maxAmount`.
export const computeLateFee = ({ mode, amount, graceDays = 0, maxAmount = null, baseAmount, daysLate }) => {
  const chargeable = daysLate - graceDays
  if (!amount || chargeable <= 0) return 0

  let fee
  if (mode === 'PER_DAY') fee = amount * chargeable
  else if (mode === 'PERCENT') fee = (baseAmount * amount) / 100
  else fee = amount

  fee = Math.round(fee)
  return maxAmount != null ? Math.min(fee, maxAmount) : fee
}
