import Counter from '../models/Counter.js'

// THY-2026-000123: one running number per organisation and year.
export const nextReceiptNumber = async (organization, session = null, now = new Date()) => {
  const year = now.getFullYear()
  const counter = await Counter.findOneAndUpdate(
    { organization, key: `receipt-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session }
  )
  return `THY-${year}-${String(counter.seq).padStart(6, '0')}`
}
