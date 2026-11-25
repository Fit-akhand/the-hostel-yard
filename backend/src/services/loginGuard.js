import { mongoStore, MINUTE } from '../middlewares/rateLimit.js'

// Wrong-password lockout. Two counters:
//  - per account and network: 5 wrong passwords in 15 minutes blocks that pair, so a guesser on one
//    connection stops quickly while the real owner on their own phone can still sign in;
//  - per account from anywhere: 20 wrong passwords in 15 minutes blocks the account for the rest of
//    that window, which slows guessing spread across many networks.
// A successful sign-in clears the per-network counter.
export const LOGIN_WINDOW_MS = 15 * MINUTE
export const MAX_FAILURES_PER_NETWORK = 5
export const MAX_FAILURES_PER_ACCOUNT = 20

const keysFor = (identifier, ip) => {
  const account = String(identifier || '').trim().toLowerCase()
  return {
    network: `login-fail:${account}|${ip || 'unknown'}`,
    account: `login-fail-any:${account}`,
  }
}

const safely = async (work, fallback) => {
  try {
    return await work()
  } catch (error) {
    console.error('[login-guard]', error.message)
    return fallback
  }
}

// Returns the date the block ends, or null when sign-in may go ahead.
export const loginBlockedUntil = async ({ identifier, ip, store = mongoStore }) => {
  const keys = keysFor(identifier, ip)
  const [network, account] = await Promise.all([
    safely(() => store.peek(keys.network), { count: 0 }),
    safely(() => store.peek(keys.account), { count: 0 }),
  ])

  if (network.count >= MAX_FAILURES_PER_NETWORK) return network.resetAt
  if (account.count >= MAX_FAILURES_PER_ACCOUNT) return account.resetAt
  return null
}

export const recordLoginFailure = async ({ identifier, ip, store = mongoStore }) => {
  const keys = keysFor(identifier, ip)
  await Promise.all([
    safely(() => store.hit(keys.network, LOGIN_WINDOW_MS)),
    safely(() => store.hit(keys.account, LOGIN_WINDOW_MS)),
  ])
}

export const clearLoginFailures = async ({ identifier, ip, store = mongoStore }) => {
  await safely(() => store.reset(keysFor(identifier, ip).network))
}
