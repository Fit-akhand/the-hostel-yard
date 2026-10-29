// Imports parsed rent-sheet JSON (properties -> rooms -> beds -> tenants -> allocations -> rent plans).
// Usage: IMPORT_MONGODB_URI=... OWNER_EMAIL=... node scripts/importRentSheets.js parsed.json [--dry]
import fs from 'node:fs'
import mongoose from 'mongoose'
import Organization from '../src/models/Organization.js'
import User from '../src/models/User.js'
import Property from '../src/models/Property.js'
import Room from '../src/models/Room.js'
import Bed from '../src/models/Bed.js'
import Tenant from '../src/models/Tenant.js'
import Allocation from '../src/models/Allocation.js'
import RentPlan from '../src/models/RentPlan.js'

const [file, flag] = process.argv.slice(2)
const dry = flag === '--dry'
const uri = process.env.IMPORT_MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_yard_local'
const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase()
const FALLBACK_MOVE_IN = new Date('2026-10-01')
const sheets = JSON.parse(fs.readFileSync(file, 'utf8'))

const floorOf = (room) => {
  const n = parseInt(String(room).replace(/\D/g, ''), 10)
  return /^\d{3}$/.test(String(room)) ? Math.floor(n / 100) : 0
}
const roomType = (c) => (c <= 1 ? 'SINGLE' : c === 2 ? 'DOUBLE' : c === 3 ? 'TRIPLE' : 'DORMITORY')
let phoneSeq = 0
const placeholderPhone = () => '0000' + String(++phoneSeq).padStart(6, '0')

const stats = { properties: 0, rooms: 0, beds: 0, tenants: 0, allocations: 0, rentPlans: 0, skippedProperties: [] }

if (dry) {
  for (const s of sheets) {
    const rooms = new Set(s.entries.map((e) => e.room))
    stats.properties++; stats.rooms += rooms.size; stats.beds += s.entries.length
    const t = s.entries.filter((e) => e.name); stats.tenants += t.length; stats.allocations += t.length; stats.rentPlans += t.filter((e) => e.rent).length
  }
  console.log('DRY RUN', stats); process.exit(0)
}

await mongoose.connect(uri)
console.log('Connected to', mongoose.connection.name)
let owner = await User.findOne({ email: ownerEmail })
let org
if (owner) org = await Organization.findById(owner.organization)
if (!owner || !org) {
  const ownerId = new mongoose.Types.ObjectId()
  org = await Organization.create({ name: 'The Hostel Yard', owner: ownerId })
  owner = await User.create({ _id: ownerId, name: 'Business Owner', phone: '0000000000', email: ownerEmail, role: 'BUSINESS_OWNER', organization: org._id, status: 'ACTIVE', isEmailVerified: true })
  console.log('Created owner account (no password set) for', ownerEmail)
}

for (const s of sheets) {
  if (await Property.findOne({ organization: org._id, name: s.name })) { stats.skippedProperties.push(s.name); continue }
  const prop = await Property.create({ organization: org._id, name: s.name, type: 'PG', address: s.address || s.name, city: s.city, state: s.state, pincode: '000000' })
  const byRoom = new Map()
  for (const e of s.entries) byRoom.set(e.room, [...(byRoom.get(e.room) || []), e])
  const rooms = await Room.insertMany([...byRoom].map(([roomNumber, list]) => ({ organization: org._id, property: prop._id, roomNumber, floor: floorOf(roomNumber), type: roomType(list.length), capacity: list.length })))
  const roomId = new Map(rooms.map((r) => [r.roomNumber, r._id]))
  const bedDocs = []; const slots = []
  for (const [roomNumber, list] of byRoom) list.forEach((e, i) => { const bed = new Bed({ organization: org._id, property: prop._id, room: roomId.get(roomNumber), bedNumber: `B${i + 1}`, status: e.name ? 'OCCUPIED' : 'AVAILABLE' }); bedDocs.push(bed); slots.push({ e, bed, room: roomId.get(roomNumber) }) })
  await Bed.insertMany(bedDocs)
  const occupied = slots.filter((x) => x.e.name && x.e.name.length >= 2)
  const tenantDocs = occupied.map(({ e }) => new Tenant({ organization: org._id, property: prop._id, name: e.name.slice(0, 100), phone: e.phone || placeholderPhone(), gender: s.gender, moveInDate: e.move ? new Date(e.move) : FALLBACK_MOVE_IN }))
  // Omit the null `user` field: the unique sparse index on it treats explicit nulls as duplicates.
  tenantDocs.forEach((t) => t.set('user', undefined))
  await Tenant.collection.insertMany(tenantDocs.map((t) => { const o = t.toObject(); delete o.user; return o }))
  const tenants = tenantDocs
  const allocs = await Allocation.insertMany(occupied.map(({ bed, room }, i) => ({ organization: org._id, property: prop._id, tenant: tenants[i]._id, room, bed: bed._id, startDate: tenants[i].moveInDate })))
  const plans = occupied.map(({ e }, i) => e.rent ? { organization: org._id, property: prop._id, tenant: tenants[i]._id, allocation: allocs[i]._id, monthlyRent: e.rent, dueDay: 5, startDate: tenants[i].moveInDate } : null).filter(Boolean)
  await RentPlan.insertMany(plans)
  stats.properties++; stats.rooms += rooms.length; stats.beds += bedDocs.length; stats.tenants += tenants.length; stats.allocations += allocs.length; stats.rentPlans += plans.length
  console.log('Imported', s.name)
}
console.log(stats)
await mongoose.disconnect()
