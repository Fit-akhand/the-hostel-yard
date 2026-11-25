import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'

import { memoryStore, rateLimit } from '../src/middlewares/rateLimit.js'
import { sameOriginGuard, sanitizeBody, securityHeaders } from '../src/middlewares/securityMiddleware.js'
import { clearLoginFailures, loginBlockedUntil, MAX_FAILURES_PER_ACCOUNT, recordLoginFailure } from '../src/services/loginGuard.js'

const serve = async (setup, run) => {
  const app = express()
  setup(app)
  const server = app.listen(0)
  try {
    await run(`http://127.0.0.1:${server.address().port}`)
  } finally {
    server.close()
  }
}

describe('rate limit', () => {
  it('allows up to the limit, then answers 429 with Retry-After', async () => {
    const store = memoryStore()
    await serve(
      (app) => app.get('/', rateLimit({ name: 't', windowMs: 60000, max: 2, store }), (_req, res) => res.json({ ok: true })),
      async (base) => {
        assert.equal((await fetch(base)).status, 200)
        assert.equal((await fetch(base)).status, 200)
        const blocked = await fetch(base)
        assert.equal(blocked.status, 429)
        assert.ok(Number(blocked.headers.get('retry-after')) > 0)
      }
    )
  })

  it('starts a fresh window after the old one ends', async () => {
    let now = 1000
    const store = memoryStore(() => now)
    assert.equal((await store.hit('k', 100)).count, 1)
    assert.equal((await store.hit('k', 100)).count, 2)
    now += 101
    assert.equal((await store.hit('k', 100)).count, 1)
  })

  it('lets requests through when the store fails', async () => {
    const store = { hit: async () => { throw new Error('database down') } }
    const original = console.error
    console.error = () => {}
    try {
      await serve(
        (app) => app.get('/', rateLimit({ name: 't', windowMs: 1000, max: 1, store }), (_req, res) => res.json({})),
        async (base) => assert.equal((await fetch(base)).status, 200)
      )
    } finally {
      console.error = original
    }
  })
})

describe('wrong-password lockout', () => {
  const who = { identifier: 'Owner@Example.com', ip: '1.1.1.1' }

  it('blocks after five wrong passwords from one network, but not from another', async () => {
    const store = memoryStore()
    for (let i = 0; i < 4; i += 1) await recordLoginFailure({ ...who, store })
    assert.equal(await loginBlockedUntil({ ...who, store }), null)
    await recordLoginFailure({ ...who, store })
    assert.ok(await loginBlockedUntil({ ...who, store }))
    assert.ok(await loginBlockedUntil({ identifier: 'owner@example.com ', ip: '1.1.1.1', store }), 'same account, different spelling')
    assert.equal(await loginBlockedUntil({ ...who, ip: '2.2.2.2', store }), null)
  })

  it('blocks the account when guesses come from many networks', async () => {
    const store = memoryStore()
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i += 1) await recordLoginFailure({ ...who, ip: `10.0.0.${i}`, store })
    assert.ok(await loginBlockedUntil({ ...who, ip: '9.9.9.9', store }))
  })

  it('forgets the network count after a correct sign-in', async () => {
    const store = memoryStore()
    for (let i = 0; i < 5; i += 1) await recordLoginFailure({ ...who, store })
    await clearLoginFailures({ ...who, store })
    assert.equal(await loginBlockedUntil({ ...who, store }), null)
  })
})

describe('request protection', () => {
  const setup = (app) => {
    app.use(securityHeaders)
    app.use(sameOriginGuard(new Set(['http://localhost:5173'])))
    app.use(express.json())
    app.use(sanitizeBody)
    app.all('/', (req, res) => res.json({ body: req.body ?? null }))
  }
  const post = (base, headers = {}, body = {}) => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

  it('refuses changes sent by another website', async () => {
    await serve(setup, async (base) => {
      assert.equal((await post(base, { Origin: 'https://evil.example' })).status, 403)
      assert.equal((await post(base, { Origin: 'null' })).status, 403)
      assert.equal((await post(base, { Origin: 'http://localhost:5173' })).status, 200)
      assert.equal((await post(base, { Origin: base })).status, 200)
      assert.equal((await post(base)).status, 200)
      assert.equal((await fetch(base, { headers: { Origin: 'https://evil.example' } })).status, 200)
    })
  })

  it('removes database operators from the body', async () => {
    await serve(setup, async (base) => {
      const res = await post(base, {}, { email: { $ne: null }, list: [{ $gt: 1, keep: 2 }] })
      assert.deepEqual((await res.json()).body, { email: {}, list: [{ keep: 2 }] })
    })
  })

  it('sends security headers', async () => {
    await serve(setup, async (base) => {
      const res = await fetch(base)
      assert.equal(res.headers.get('x-frame-options'), 'DENY')
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
      assert.match(res.headers.get('content-security-policy'), /default-src 'none'/)
    })
  })
})
