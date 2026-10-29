// Creates (or rebuilds) a fake "demo" organisation used by the public guest login.
// Usage: SEED_MONGODB_URI=mongodb://... node scripts/seedDemoOrg.js
// Everything it writes belongs to one organisation, so re-running replaces it cleanly.
import mongoose from 'mongoose'
import Organization from '../src/models/Organization.js'
import User from '../src/models/User.js'
import Property from '../src/models/Property.js'
import Room from '../src/models/Room.js'
import Bed from '../src/models/Bed.js'
import Tenant from '../src/models/Tenant.js'
import Allocation from '../src/models/Allocation.js'
import RentPlan from '../src/models/RentPlan.js'
import RentDue from '../src/models/RentDue.js'
import Payment from '../src/models/Payment.js'
import PaymentSettings from '../src/models/PaymentSettings.js'
import Expense from '../src/models/Expense.js'
import Complaint from '../src/models/Complaint.js'
import Announcement from '../src/models/Announcement.js'
import Notification from '../src/models/Notification.js'
import PropertyManagerAssignment from '../src/models/PropertyManagerAssignment.js'
import { MANAGER_ALLOWED_PERMISSIONS } from '../src/constants/managerPermissions.js'

const uri = process.env.SEED_MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_yard_local'
const ORG_NAME = 'The Hostel Yard Demo'
await mongoose.connect(uri)
console.log('Seeding demo organisation into', mongoose.connection.host, '/', mongoose.connection.name)

// --- deterministic pseudo-random so every run gives the same demo -------------------------------
let seed = 20261029
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const chance = (p) => rnd() < p

// --- wipe a previous demo org -------------------------------------------------------------------
const old = await Organization.findOne({ name: ORG_NAME })
if (old) {
  const f = { organization: old._id }
  for (const M of [Notification, Announcement, Complaint, Expense, Payment, PaymentSettings, RentDue, RentPlan, Allocation, Tenant, Bed, Room, PropertyManagerAssignment, Property]) await M.deleteMany(f)
  await User.deleteMany({ organization: old._id, isDemo: true })
  await Organization.deleteOne({ _id: old._id })
  console.log('Removed previous demo organisation')
}

// --- people -------------------------------------------------------------------------------------
const ownerId = new mongoose.Types.ObjectId()
const org = await Organization.create({ name: ORG_NAME, owner: ownerId })
const mkUser = (extra) => User.create({ organization: org._id, status: 'ACTIVE', isDemo: true, isPhoneVerified: true, isEmailVerified: true, ...extra })
const owner = await mkUser({ _id: ownerId, name: 'Demo Owner', phone: '9000000001', email: 'owner@demo.thehostelyard.app', role: 'BUSINESS_OWNER' })
const manager = await mkUser({ name: 'Demo Manager', phone: '9000000002', email: 'manager@demo.thehostelyard.app', role: 'PROPERTY_MANAGER' })

// --- properties, rooms, beds --------------------------------------------------------------------
const PROPS = [
  { name: 'Sunrise Boys PG', city: 'Noida', state: 'Uttar Pradesh', address: 'Sector 62', pincode: '201309', gender: 'MALE', rooms: 14, rent: [8500, 9500, 11000] },
  { name: 'Lotus Girls PG', city: 'Noida', state: 'Uttar Pradesh', address: 'Sector 58', pincode: '201301', gender: 'FEMALE', rooms: 12, rent: [9000, 10500, 12000] },
  { name: 'Urban Nest Co-living', city: 'Delhi', state: 'Delhi', address: 'Karol Bagh', pincode: '110005', gender: 'OTHER', rooms: 10, rent: [11000, 13500, 16000] },
]
const MALE = ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Kabir', 'Ishaan', 'Aditya', 'Dev', 'Rahul', 'Karan', 'Nikhil', 'Siddharth', 'Yash', 'Harsh', 'Manav', 'Pranav']
const FEMALE = ['Ananya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Naina', 'Riya', 'Saanvi', 'Tanya', 'Aditi', 'Pooja', 'Shreya', 'Neha', 'Simran', 'Aarohi', 'Kriti']
const SUR = ['Sharma', 'Verma', 'Singh', 'Gupta', 'Mehta', 'Kapoor', 'Iyer', 'Nair', 'Reddy', 'Joshi', 'Bansal', 'Malhotra', 'Chopra', 'Saxena', 'Bhatia', 'Agarwal']

const now = new Date()
const month = (offset) => { const d = new Date(now.getFullYear(), now.getMonth() + offset, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const MONTHS = [month(-2), month(-1), month(0)]
let phoneSeq = 0
const stats = { properties: 0, rooms: 0, beds: 0, tenants: 0, dues: 0, payments: 0 }
const allTenants = []

for (const [pi, def] of PROPS.entries()) {
  const prop = await Property.create({ organization: org._id, name: def.name, type: 'PG', address: def.address, city: def.city, state: def.state, pincode: def.pincode })
  await PaymentSettings.create({ organization: org._id, property: prop._id, upiId: 'demo@upi', accountName: def.name, paymentInstructions: 'Demo only. No real payment is taken.', isEnabled: true })
  stats.properties++
  const base = { organization: org._id, property: prop._id }
  const names = def.gender === 'FEMALE' ? FEMALE : def.gender === 'MALE' ? MALE : [...MALE, ...FEMALE]
  for (let r = 1; r <= def.rooms; r++) {
    const floor = Math.floor((r - 1) / 5)
    const cap = pick([1, 2, 2, 3])
    const roomNumber = String((floor + 1) * 100 + ((r - 1) % 5) + 1)
    const room = await Room.create({ ...base, roomNumber, floor, type: ['SINGLE', 'DOUBLE', 'TRIPLE'][cap - 1], capacity: cap })
    stats.rooms++
    const rent = def.rent[cap - 1]
    for (let b = 1; b <= cap; b++) {
      const occupied = chance(0.84)
      const bed = await Bed.create({ ...base, room: room._id, bedNumber: `B${b}`, status: occupied ? 'OCCUPIED' : 'AVAILABLE' })
      stats.beds++
      if (!occupied) continue
      const gender = def.gender === 'OTHER' ? pick(['MALE', 'FEMALE']) : def.gender
      const nm = `${pick(gender === 'FEMALE' ? FEMALE : MALE)} ${pick(SUR)}`
      const moveIn = new Date(now.getFullYear(), now.getMonth() - 1 - Math.floor(rnd() * 8), 1 + Math.floor(rnd() * 20))
      const tenantDoc = new Tenant({ ...base, name: nm, phone: `90000${String(10000 + ++phoneSeq)}`, gender, moveInDate: moveIn })
      const t = tenantDoc.toObject(); delete t.user
      await Tenant.collection.insertOne(t)
      stats.tenants++
      const alloc = await Allocation.create({ ...base, tenant: t._id, room: room._id, bed: bed._id, startDate: moveIn })
      const plan = await RentPlan.create({ ...base, tenant: t._id, allocation: alloc._id, monthlyRent: rent, dueDay: 5, startDate: moveIn })
      allTenants.push({ t, alloc, plan, rent, prop, room, bed })
    }
  }
}

// --- dues and payments: older months mostly paid, current month mixed -----------------------------
for (const x of allTenants) {
  for (const [mi, bm] of MONTHS.entries()) {
    const current = mi === MONTHS.length - 1
    const [y, m] = bm.split('-').map(Number)
    const dueDate = new Date(y, m - 1, 5)
    const roll = rnd()
    let status = 'PAID', paid = x.rent
    if (current) { if (roll < 0.45) status = 'PAID'; else if (roll < 0.62) { status = 'PARTIAL'; paid = Math.round(x.rent / 2) } else if (roll < 0.9) { status = 'PENDING'; paid = 0 } else { status = 'OVERDUE'; paid = 0 } }
    else if (roll > 0.93) { status = 'PARTIAL'; paid = Math.round(x.rent / 2) }
    const base = { organization: org._id, property: x.prop._id }
    const due = await RentDue.create({ ...base, tenant: x.t._id, allocation: x.alloc._id, rentPlan: x.plan._id, billingMonth: bm, dueDate, amount: x.rent, paidAmount: paid, status })
    stats.dues++
    if (paid > 0) {
      const method = chance(0.75) ? 'UPI' : 'CASH'
      const verified = !current || chance(0.8)
      await Payment.create({ ...base, tenant: x.t._id, rentDue: due._id, amount: paid, method, status: verified ? 'VERIFIED' : 'PENDING', paymentDate: new Date(y, m - 1, 3 + Math.floor(rnd() * 6)), transactionReference: method === 'UPI' ? `UPI${100000 + Math.floor(rnd() * 899999)}` : undefined, recordedBy: owner._id, ...(verified ? { verifiedBy: owner._id, verifiedAt: new Date(y, m - 1, 8) } : {}) })
      stats.payments++
    }
  }
}

// --- expenses, complaints, announcements --------------------------------------------------------
const props = await Property.find({ organization: org._id })
const CATS = [['ELECTRICITY', 14000, 26000], ['WATER', 2500, 6000], ['INTERNET', 5500, 8500], ['FOOD', 30000, 60000], ['MAINTENANCE', 6000, 18000], ['SALARY', 40000, 95000], ['CLEANING', 6000, 12000], ['SUPPLIES', 3000, 9000]]
for (const p of props) for (const bm of MONTHS) {
  const [y, m] = bm.split('-').map(Number)
  for (const [category, lo, hi] of CATS) await Expense.create({ organization: org._id, property: p._id, category, amount: Math.round((lo + rnd() * (hi - lo)) / 50) * 50, paymentMethod: pick(['UPI', 'CASH', 'BANK_TRANSFER']), expenseDate: new Date(y, m - 1, 2 + Math.floor(rnd() * 25)), description: `${category[0]}${category.slice(1).toLowerCase()} - ${bm}`, recordedBy: owner._id })
}
const COMPLAINTS = [['Wi-Fi is slow in the evening', 'WIFI', 'HIGH'], ['AC not cooling', 'AC', 'HIGH'], ['Bathroom tap leaking', 'PLUMBING', 'MEDIUM'], ['Room not cleaned today', 'CLEANING', 'LOW'], ['Tube light flickering', 'ELECTRICAL', 'MEDIUM'], ['Wardrobe lock broken', 'FURNITURE', 'LOW'], ['Main gate security issue', 'SECURITY', 'URGENT'], ['Window glass cracked', 'MAINTENANCE', 'MEDIUM'], ['Water heater not working', 'ELECTRICAL', 'HIGH'], ['Hot water timing request', 'OTHER', 'LOW']]
const STATUS = ['OPEN', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
for (const [i, [title, category, priority]] of COMPLAINTS.entries()) {
  const x = allTenants[(i * 7) % allTenants.length]
  await Complaint.create({ organization: org._id, property: x.prop._id, tenant: x.t._id, room: x.room._id, bed: x.bed._id, title, description: `${title}. Please look into this.`, category, priority, status: STATUS[i % STATUS.length], createdBy: owner._id })
}
for (const p of props) for (const [title, message, type] of [['Water supply maintenance', 'Water supply will be off on Sunday from 10 am to 2 pm.', 'MAINTENANCE'], ['Rent reminder', 'Please pay this month\'s rent by the 5th to avoid late fees.', 'PAYMENT'], ['Festival dinner', 'Special dinner on Saturday at 8 pm. Everyone is invited.', 'EVENT']])
  await Announcement.create({ organization: org._id, property: p._id, title, message, type, priority: 'MEDIUM', audience: 'PROPERTY_TENANTS', status: 'PUBLISHED', publishedAt: now, createdBy: owner._id })

// --- manager assignments ------------------------------------------------------------------------
for (const p of props.slice(0, 2)) await PropertyManagerAssignment.create({ manager: manager._id, property: p._id, assignedBy: owner._id, permissions: [...new Set([...MANAGER_ALLOWED_PERMISSIONS, 'VIEW_DUES'])] })

// --- the demo tenant: link a user to one real tenant of the first property -----------------------
const pick1 = allTenants.find((x) => String(x.prop._id) === String(props[0]._id) && x.rent >= 9000) || allTenants[0]
const tenantUser = await mkUser({ name: pick1.t.name, phone: '9000000003', email: 'tenant@demo.thehostelyard.app', role: 'TENANT' })
await Tenant.collection.updateOne({ _id: pick1.t._id }, { $set: { user: tenantUser._id } })
// Give the demo tenant something to look at: this month's rent is open and last month's is paid.
const openDue = await RentDue.findOne({ tenant: pick1.t._id, billingMonth: MONTHS[2] })
await Payment.deleteMany({ rentDue: openDue._id })
await RentDue.updateOne({ _id: openDue._id }, { $set: { status: 'PENDING', paidAmount: 0 } })
for (const [title, message, type] of [['Rent due soon', `Your rent for ${MONTHS[2]} is due on the 5th.`, 'GENERAL'], ['Payment verified', 'Your last payment was verified. Thank you!', 'PAYMENT_VERIFIED']])
  await Notification.create({ organization: org._id, recipient: tenantUser._id, property: pick1.prop._id, type, title, message })
for (const [title, message, type] of [['Payment received', 'A new UPI payment is waiting for verification.', 'PAYMENT_RECEIVED'], ['New complaint', 'A tenant raised a complaint: Wi-Fi is slow.', 'COMPLAINT_CREATED']])
  for (const u of [owner, manager]) await Notification.create({ organization: org._id, recipient: u._id, type, title, message })

console.log('Done', stats, { demoUsers: ['owner@demo.thehostelyard.app', 'manager@demo.thehostelyard.app', 'tenant@demo.thehostelyard.app'] })
await mongoose.disconnect()
