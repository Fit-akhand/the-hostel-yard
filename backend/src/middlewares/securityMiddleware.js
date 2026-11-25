import helmet from 'helmet'

// --------------------------------------------------
// SECURITY HEADERS
// --------------------------------------------------
// The API only returns JSON (and the occasional private file), so nothing may load from it or frame it.
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  xFrameOptions: { action: 'deny' },
})

// --------------------------------------------------
// STRIP MONGODB OPERATORS FROM REQUEST BODIES
// --------------------------------------------------
// A body like { "email": { "$ne": null } } must never reach a database query as an operator.
const stripOperators = (value, depth = 0) => {
  if (depth > 20 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = stripOperators(item, depth + 1)
    })
    return value
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      delete value[key]
    } else {
      value[key] = stripOperators(value[key], depth + 1)
    }
  }
  return value
}

export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') stripOperators(req.body)
  next()
}

// --------------------------------------------------
// CROSS-SITE REQUEST CHECK
// --------------------------------------------------
// Sign-in uses a cookie, so another website could try to make a visitor's browser send a change request
// (a hidden form). Browsers add an Origin header to such requests; a change request whose Origin is
// neither this site nor an allowed frontend is refused. Requests without an Origin (server-to-server
// calls such as the payment webhook or the daily job) are not affected.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const isSameSite = (origin, req, allowedOrigins) => {
  if (allowedOrigins.has(origin)) return true
  try {
    const { host } = new URL(origin)
    const requestHost = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim()
    return Boolean(host && requestHost && host === requestHost)
  } catch {
    return false
  }
}

export const sameOriginGuard = (allowedOrigins) => (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()

  const origin = req.get('origin')
  if (!origin) return next()
  // "null" is sent by sandboxed frames and local files, never by this app.
  if (origin !== 'null' && isSameSite(origin, req, allowedOrigins)) return next()

  return res.status(403).json({
    success: false,
    message: 'This request came from another website and was blocked.',
  })
}
