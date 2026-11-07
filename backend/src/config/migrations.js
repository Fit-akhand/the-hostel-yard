import mongoose from 'mongoose'
import Tenant from '../models/Tenant.js'

// Tenants used to be saved with `user: null` and a unique index on `user`, so only ONE tenant without an
// account could ever exist. This repairs a database that still has that: removes the stored nulls, drops the old
// index and builds the new one. It does nothing once the old index is gone.
export const healTenantUserIndex = async () => {
  const collection = mongoose.connection.collection('tenants')

  let indexes = []
  try {
    indexes = await collection.indexes()
  } catch {
    return // the collection does not exist yet, so there is nothing to repair
  }

  if (indexes.some((index) => index.name === 'user_1')) {
    await collection.updateMany({ user: null }, { $unset: { user: '' } })
    await collection.dropIndex('user_1')
    console.log('Repaired the tenants.user index.')
  }

  await Tenant.createIndexes()
}
