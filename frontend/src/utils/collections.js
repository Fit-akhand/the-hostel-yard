/**
 * Normalize API list payloads so UI code can always call .map/.filter/.find.
 * Never assume a value is an array just because it is truthy.
 */
export function asArray(value, ...hintKeys) {
  if (Array.isArray(value)) return value
  if (value == null) return []
  if (typeof value !== 'object') return []

  const hints = hintKeys.flat().filter((key) => typeof key === 'string' && key.length > 1)

  for (const key of hints) {
    if (Array.isArray(value[key])) return value[key]
  }

  for (const key of ['items', 'results', 'rows', 'list']) {
    if (Array.isArray(value[key])) return value[key]
  }

  if (Array.isArray(value.data)) return value.data

  if (value.data && typeof value.data === 'object') {
    for (const key of hints) {
      if (Array.isArray(value.data[key])) return value.data[key]
    }
    for (const key of ['items', 'results', 'rows']) {
      if (Array.isArray(value.data[key])) return value.data[key]
    }
    const nested = Object.values(value.data).filter(Array.isArray)
    if (nested.length === 1) return nested[0]
  }

  const top = Object.values(value).filter(Array.isArray)
  if (top.length === 1) return top[0]

  return []
}

export function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value
}

export function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
