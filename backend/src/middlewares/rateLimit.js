import mongoose from 'mongoose'

import RateLimit from '../models/RateLimit.js'

// --------------------------------------------------
// STORES
// --------------------------------------------------
// A store counts hits per key inside a time window. hit() adds one and returns the new count and when
// the window ends; peek() reads without counting; reset() forgets the key.

const isConnected = () => mongoose.connection.readyState === 1

// MongoDB store: one atomic update per hit, shared by every server instance.
export const mongoStore = {
  async hit(key, windowMs) {
    if (!isConnected()) return null

    const now = new Date()
    const fresh = new Date(now.getTime() + windowMs)
    const live = { $gt: ['$resetAt', now] }
    const update = [
      {
        $set: {
          count: { $cond: [live, { $add: ['$count', 1] }, 1] },
          resetAt: { $cond: [live, '$resetAt', fresh] },
        },
      },
    ]

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await RateLimit.collection.findOneAndUpdate({ key }, update, {
          upsert: true,
          returnDocument: 'after',
        })
        // Older drivers wrap the document in { value }.
        const doc = result && 'value' in result && 'ok' in result ? result.value : result
        return doc ? { count: doc.count, resetAt: new Date(doc.resetAt) } : null
      } catch (error) {
        // Two first hits at the same moment: one insert wins, the other retries as an update.
        if (error?.code !== 11000 || attempt === 1) throw error
      }
    }

    return null
  },

  async peek(key) {
    if (!isConnected()) return { count: 0, resetAt: null }
    const doc = await RateLimit.collection.findOne({ key })
    if (!doc || new Date(doc.resetAt) <= new Date()) return { count: 0, resetAt: null }
    return { count: doc.count, resetAt: new Date(doc.resetAt) }
  },

  async reset(key) {
    if (!isConnected()) return
    await RateLimit.collection.deleteOne({ key })
  },
}

// In-memory store, for tests.
export const memoryStore = (clock = () => Date.now()) => {
  const entries = new Map()

  return {
    async hit(key, windowMs) {
      const now = clock()
      const entry = entries.get(key)
      if (entry && entry.resetAt > now) {
        entry.count += 1
        return { count: entry.count, resetAt: new Date(entry.resetAt) }
      }
      entries.set(key, { count: 1, resetAt: now + windowMs })
      return { count: 1, resetAt: new Date(now + windowMs) }
    },
    async peek(key) {
      const entry = entries.get(key)
      if (!entry || entry.resetAt <= clock()) return { count: 0, resetAt: null }
      return { count: entry.count, resetAt: new Date(entry.resetAt) }
    },
    async reset(key) {
      entries.delete(key)
    },
  }
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE

export const describeWait = (seconds) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export const secondsUntil = (date, now = Date.now()) =>
  Math.max(1, Math.ceil((new Date(date).getTime() - now) / 1000))

export const tooManyRequests = (res, retryAfterSeconds, message) => {
  res.set('Retry-After', String(retryAfterSeconds))
  return res.status(429).json({
    success: false,
    message: message || `Too many attempts. Please try again in ${describeWait(retryAfterSeconds)}.`,
  })
}

const normalise = (value) => String(value || '').trim().toLowerCase()

export const byIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown'
export const byIpAnd = (field) => (req) => `${byIp(req)}|${normalise(req.body?.[field])}`
export const byBodyField = (field) => (req) => normalise(req.body?.[field]) || null
export const byUser = (req) => (req.user?._id ? String(req.user._id) : byIp(req))

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------
// Counts every request that reaches it. If the store is unavailable the request goes through: a limit
// that cannot be checked must not lock everyone out.
export const rateLimit = ({ name, windowMs, max, key = byIp, message, store = mongoStore }) =>
  async (req, res, next) => {
    let id = null
    try {
      id = key(req)
    } catch {
      id = null
    }
    if (!id) return next()

    try {
      const state = await store.hit(`${name}:${id}`, windowMs)
      if (state && state.count > max) {
        return tooManyRequests(res, secondsUntil(state.resetAt), message)
      }
    } catch (error) {
      console.error(`[rate-limit] ${name} not checked:`, error.message)
    }

    return next()
  }
