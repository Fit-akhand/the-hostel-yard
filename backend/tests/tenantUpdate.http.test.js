import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import cookieParser from 'cookie-parser'

import { errorHandler } from '../src/middlewares/errorMiddleware.js'
import { validate, validateParams } from '../src/middlewares/validateMiddleware.js'
import {
  tenantIdParamSchema,
  updateTenantSchema,
} from '../src/validators/tenantValidator.js'

const createApp = () => {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  app.put(
    '/api/tenants/:tenantId',
    (req, res, next) => {
      if (req.headers['x-test-user'] === 'none') {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        })
      }

      req.user = JSON.parse(req.headers['x-test-user'])
      next()
    },
    validateParams(tenantIdParamSchema),
    validate(updateTenantSchema),
    (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Tenant updated successfully.',
        data: {
          tenant: {
            ...req.body,
            _id: req.params.tenantId,
          },
        },
      })
    }
  )

  app.use(errorHandler)

  return app
}

const request = async (app, { method, path, headers = {}, body }) => {
  const server = app.listen(0)
  const { port } = server.address()

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    return {
      status: response.status,
      body: data,
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

describe('PUT /api/tenants/:tenantId request handling', () => {
  const app = createApp()

  it('returns 401 when unauthenticated', async () => {
    const response = await request(app, {
      method: 'PUT',
      path: '/api/tenants/64f1c2a1b2c3d4e5f6789012',
      headers: {
        'x-test-user': 'none',
      },
      body: {
        name: 'Rahul Kumar',
      },
    })

    assert.equal(response.status, 401)
    assert.equal(response.body.success, false)
    assert.equal(response.body.message, 'Authentication required.')
  })

  it('returns validation errors for an invalid tenant ID', async () => {
    const response = await request(app, {
      method: 'PUT',
      path: '/api/tenants/not-a-valid-id',
      headers: {
        'x-test-user': JSON.stringify({
          role: 'BUSINESS_OWNER',
        }),
      },
      body: {
        name: 'Rahul Kumar',
      },
    })

    assert.equal(response.status, 400)
    assert.equal(response.body.success, false)
    assert.equal(response.body.message, 'Validation failed.')
  })

  it('returns validation errors for invalid input', async () => {
    const response = await request(app, {
      method: 'PUT',
      path: '/api/tenants/64f1c2a1b2c3d4e5f6789012',
      headers: {
        'x-test-user': JSON.stringify({
          role: 'BUSINESS_OWNER',
        }),
      },
      body: {
        phone: '123',
      },
    })

    assert.equal(response.status, 400)
    assert.equal(response.body.success, false)
    assert.equal(response.body.message, 'Validation failed.')
  })

  it('ignores attempts to change organization or property', async () => {
    const response = await request(app, {
      method: 'PUT',
      path: '/api/tenants/64f1c2a1b2c3d4e5f6789012',
      headers: {
        'x-test-user': JSON.stringify({
          role: 'BUSINESS_OWNER',
        }),
      },
      body: {
        name: 'Rahul Kumar',
        organization: 'ffffffffffffffffffffffff',
        property: 'eeeeeeeeeeeeeeeeeeeeeeee',
        status: 'LEFT',
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.body.data.tenant.name, 'Rahul Kumar')
    assert.equal(response.body.data.tenant.organization, undefined)
    assert.equal(response.body.data.tenant.property, undefined)
    assert.equal(response.body.data.tenant.status, undefined)
  })
})
