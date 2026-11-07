import mongoose from 'mongoose'
import { env } from './env.js'
import { healTenantUserIndex } from './migrations.js'

export const connectDB = async () => {
  if (!env.mongodbUri) {
    throw new Error('Missing required environment variable: MONGODB_URI')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise()
    return mongoose.connection
  }

  try {
    const connection = await mongoose.connect(env.mongodbUri)

    console.log(`MongoDB connected: ${connection.connection.host}`)

    try {
      await healTenantUserIndex()
    } catch (error) {
      console.error('Could not repair the tenant index:', error.message)
    }

    return connection
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    throw error
  }
}
