import axios from 'axios'
import { API_URL } from '../config/api'
import { asArray } from '../utils/collections'

export { asArray }

export class ApiError extends Error {
  constructor({ message, status, errors, data }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || []
    this.data = data
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let onUnauthorized = null

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const payload = error.response?.data
    const message =
      payload?.message || error.message || 'Unable to complete this request.'
    const errors = payload?.errors

    if (status === 401 && typeof onUnauthorized === 'function') {
      const url = String(error.config?.url || '')
      if (!url.includes('/auth/login')) {
        onUnauthorized()
      }
    }

    return Promise.reject(
      new ApiError({
        message,
        status,
        errors,
        data: payload,
      })
    )
  }
)

export function unwrap(response) {
  return response.data
}

/**
 * Reconstruct pick keys when a caller accidentally spreads a string
 * (`...'properties'` → 'p','r','o',...). Real one-character keys are not used.
 */
export function normalizePickKeys(keys) {
  if (!keys?.length) return []
  if (keys.length === 1 && Array.isArray(keys[0])) {
    return keys[0].filter((key) => typeof key === 'string' && key.length)
  }
  if (keys.length > 2 && keys.every((key) => typeof key === 'string' && key.length === 1)) {
    return [keys.join('')]
  }
  return keys.filter((key) => typeof key === 'string' && key.length > 0)
}

export function pickData(payload, ...keys) {
  if (!payload) return null
  const resolved = normalizePickKeys(keys)
  const envelope = payload.data

  if (envelope != null && resolved.length) {
    if (typeof envelope === 'object' && !Array.isArray(envelope)) {
      for (const key of resolved) {
        if (envelope[key] !== undefined) return envelope[key]
      }
    }
  }

  for (const key of resolved) {
    if (payload[key] !== undefined) return payload[key]
  }

  if (!resolved.length) {
    return envelope !== undefined ? envelope : payload
  }

  return envelope !== undefined ? envelope : payload
}

export function pickList(payload, ...keys) {
  const resolved = normalizePickKeys(keys)
  return asArray(pickData(payload, ...resolved), ...resolved)
}

export function fieldErrors(error) {
  const map = {}
  const items = Array.isArray(error?.errors) ? error.errors : []
  for (const item of items) {
    if (item?.field) map[item.field] = item.message
  }
  return map
}
