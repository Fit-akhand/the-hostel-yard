// Pure salary maths, kept free of the database so every rule can be tested.
//
// Rules
//  - Dates are YYYY-MM-DD text. A month is YYYY-MM.
//  - Only days between the join date and the leaving date count.
//  - MONTHLY pay: every active day is paid unless marked ABSENT (loses a day) or HALF_DAY (loses half).
//    Days with no entry count as present, and the weekly off is paid.
//    gross = salary * payableDays / days in the month.
//  - DAILY pay: only days marked PRESENT, HALF_DAY (half) or PAID_LEAVE are paid. No entry = not worked.
//  - Advances are taken back from the net pay, never more than what is left after bonus and deductions.

const pad = (n) => String(n).padStart(2, '0')

export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const weekday = (month, day) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, day).getDay()
}

const round2 = (n) => Math.round(n * 100) / 100

export const calculatePayroll = ({ employee, month, records = [], adjustments = [], advanceBalance = 0 }) => {
  const dim = daysInMonth(month)
  const first = `${month}-01`
  const last = `${month}-${pad(dim)}`
  const from = employee.joinDate > first ? employee.joinDate : first
  const to = employee.leftDate && employee.leftDate < last ? employee.leftDate : last

  const byDate = new Map(records.map((r) => [r.date, r.status]))
  const counts = { present: 0, half: 0, paidLeave: 0, weeklyOff: 0, absent: 0, unmarked: 0 }
  let activeDays = 0

  for (let day = 1; day <= dim; day++) {
    const date = `${month}-${pad(day)}`
    if (date < from || date > to) continue
    activeDays++

    const status = byDate.get(date) || (employee.weeklyOff === weekday(month, day) ? 'WEEKLY_OFF' : null)
    if (status === 'PRESENT') counts.present++
    else if (status === 'HALF_DAY') counts.half++
    else if (status === 'PAID_LEAVE') counts.paidLeave++
    else if (status === 'WEEKLY_OFF') counts.weeklyOff++
    else if (status === 'ABSENT') counts.absent++
    else counts.unmarked++
  }

  let payableDays
  let grossPay
  if (employee.payType === 'DAILY') {
    payableDays = counts.present + counts.half * 0.5 + counts.paidLeave
    grossPay = employee.salary * payableDays
  } else {
    payableDays = activeDays - counts.absent - counts.half * 0.5
    grossPay = (employee.salary * payableDays) / dim
  }
  grossPay = round2(grossPay)

  const sum = (type) => adjustments.filter((a) => a.type === type).reduce((t, a) => t + a.amount, 0)
  const bonus = sum('BONUS')
  const deductions = sum('DEDUCTION')
  const advanceRecovered = round2(Math.min(Math.max(advanceBalance, 0), Math.max(0, grossPay + bonus - deductions)))
  const netPay = round2(grossPay + bonus - deductions - advanceRecovered)

  return {
    payType: employee.payType,
    baseSalary: employee.salary,
    daysInMonth: dim,
    presentDays: counts.present + (employee.payType === 'MONTHLY' ? counts.unmarked : 0),
    halfDays: counts.half,
    paidLeaves: counts.paidLeave,
    weeklyOffs: counts.weeklyOff,
    absentDays: counts.absent,
    payableDays: round2(payableDays),
    grossPay,
    bonus,
    deductions,
    advanceRecovered,
    netPay,
  }
}
