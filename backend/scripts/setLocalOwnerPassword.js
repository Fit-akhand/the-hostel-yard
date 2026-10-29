// Local-only helper: sets the owner's password in the local database. Reads OWNER_PASSWORD from the environment.
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../src/models/User.js'

const uri = process.env.IMPORT_MONGODB_URI || 'mongodb://127.0.0.1:27017/hostel_yard_local'
if (!/127\.0\.0\.1|localhost/.test(uri)) throw new Error('Refusing to run against a non-local database')
await mongoose.connect(uri)
const res = await User.updateOne({ email: process.env.OWNER_EMAIL.toLowerCase() }, { passwordHash: await bcrypt.hash(process.env.OWNER_PASSWORD, 10) })
console.log('matched', res.matchedCount, 'modified', res.modifiedCount)
await mongoose.disconnect()
