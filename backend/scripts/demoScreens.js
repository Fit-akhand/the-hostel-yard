// Temporary sample records for documentation screenshots. `seed` writes them, `clean` removes them again.
import fs from 'node:fs'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Property from '../src/models/Property.js'
import Tenant from '../src/models/Tenant.js'
import Allocation from '../src/models/Allocation.js'
import RentDue from '../src/models/RentDue.js'
import Payment from '../src/models/Payment.js'
import Expense from '../src/models/Expense.js'
import Complaint from '../src/models/Complaint.js'
import Announcement from '../src/models/Announcement.js'

const [mode, stateFile] = process.argv.slice(2)
const uri = process.env.IMPORT_MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_yard_local'
if (!/127\.0\.0\.1|localhost/.test(uri)) throw new Error('Local database only')
await mongoose.connect(uri)

if (mode === 'clean') {
  const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  await Payment.deleteMany({ _id: { $in: st.payments } })
  await Expense.deleteMany({ _id: { $in: st.expenses } })
  await Complaint.deleteMany({ _id: { $in: st.complaints } })
  await Announcement.deleteMany({ _id: { $in: st.announcements } })
  for (const d of st.dues) await RentDue.updateOne({ _id: d._id }, { $set: { paidAmount: d.paidAmount, status: d.status } })
  console.log('cleaned', Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v.length])))
  await mongoose.disconnect(); process.exit(0)
}

const owner = await User.findOne({ email: process.env.OWNER_EMAIL.toLowerCase() })
const prop = await Property.findOne({ organization: owner.organization, name: 'Sector 58 PG' })
const base = { organization: owner.organization, property: prop._id }
const dues = await RentDue.find({ ...base, billingMonth: '2026-10' }).populate('tenant', 'name').limit(8)
const state = { payments: [], expenses: [], complaints: [], announcements: [], dues: [] }
const day = (n) => new Date(2026, 9, n)
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state))

// Payments: mix of verified, pending and rejected, with the matching due updated.
const plan = [['VERIFIED', 'UPI'], ['VERIFIED', 'CASH'], ['PENDING', 'UPI'], ['PENDING', 'UPI'], ['VERIFIED', 'UPI'], ['REJECTED', 'UPI'], ['PENDING', 'CASH']]
for (const [i, [status, method]] of plan.entries()) {
  const due = dues[i]; if (!due) continue
  state.dues.push({ _id: due._id, paidAmount: due.paidAmount, status: due.status }); save()
  const p = await Payment.create({ ...base, tenant: due.tenant._id, rentDue: due._id, amount: due.amount, method, status, paymentDate: day(3 + i), transactionReference: method === 'UPI' ? `UPI${48210 + i * 37}` : undefined, recordedBy: owner._id, ...(status === 'VERIFIED' ? { verifiedBy: owner._id, verifiedAt: day(4 + i) } : {}), ...(status === 'REJECTED' ? { rejectedBy: owner._id, rejectedAt: day(5 + i), rejectionReason: 'Reference not found' } : {}) })
  state.payments.push(p._id); save()
  if (status === 'VERIFIED') await RentDue.updateOne({ _id: due._id }, { $set: { paidAmount: due.amount, status: 'PAID' } })
}

const exp = [['ELECTRICITY', 18450, 'UPI', 2, 'October electricity bill'], ['INTERNET', 6999, 'BANK_TRANSFER', 3, 'Broadband and Wi-Fi'], ['FOOD', 48098, 'UPI', 5, 'Groceries and vegetables'], ['CLEANING', 9200, 'CASH', 7, 'Housekeeping staff'], ['MAINTENANCE', 14500, 'UPI', 9, 'AC servicing'], ['SALARY', 101000, 'BANK_TRANSFER', 10, 'Staff salaries'], ['WATER', 3800, 'CASH', 12, 'Water tanker']]
for (const [category, amount, paymentMethod, d, description] of exp) state.expenses.push((await Expense.create({ ...base, category, amount, paymentMethod, expenseDate: day(d), description, recordedBy: owner._id }))._id)

const allocs = await Allocation.find({ ...base, status: 'ACTIVE' }).limit(6)
const cs = [['Wi-Fi not working on 2nd floor', 'WIFI', 'HIGH', 'OPEN'], ['AC remote missing', 'AC', 'MEDIUM', 'ASSIGNED'], ['Bathroom tap leaking', 'PLUMBING', 'HIGH', 'IN_PROGRESS'], ['Room not cleaned', 'CLEANING', 'LOW', 'RESOLVED'], ['Tube light flickering', 'ELECTRICAL', 'MEDIUM', 'OPEN'], ['Broken chair', 'FURNITURE', 'LOW', 'CLOSED']]
for (const [i, [title, category, priority, status]] of cs.entries()) {
  const a = allocs[i]; if (!a) continue
  state.complaints.push((await Complaint.create({ ...base, tenant: a.tenant, room: a.room, bed: a.bed, title, description: `${title}. Please check at the earliest.`, category, priority, status, createdBy: owner._id }))._id)
}
for (const [title, message] of [['Water supply maintenance', 'Water supply will be off on Sunday 10am to 2pm.'], ['Rent due reminder', 'Please clear October rent by the 5th.']]) state.announcements.push((await Announcement.create({ ...base, title, message, type: 'GENERAL', priority: 'MEDIUM', audience: 'PROPERTY_TENANTS', status: 'PUBLISHED', publishedAt: day(8), createdBy: owner._id }))._id)

fs.writeFileSync(stateFile, JSON.stringify(state))
console.log('seeded', Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v.length])))
await mongoose.disconnect()
