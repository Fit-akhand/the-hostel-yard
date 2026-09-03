import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  tenantIdParamSchema,
  updateTenantSchema,
} from '../src/validators/tenantValidator.js'

describe('updateTenantSchema', () => {
  it('accepts a partial profile update', () => {
    const result = updateTenantSchema.safeParse({
      name: 'Rahul Kumar',
      phone: '9876543210',
    })

    assert.equal(result.success, true)
    assert.equal(result.data.name, 'Rahul Kumar')
    assert.equal(result.data.phone, '9876543210')
  })

  it('rejects an empty update body', () => {
    const result = updateTenantSchema.safeParse({})

    assert.equal(result.success, false)
  })

  it('strips organization, property, and status', () => {
    const result = updateTenantSchema.safeParse({
      name: 'Rahul Kumar',
      organization: '6a91dfae9f412a1dc28492e0',
      property: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      propertyId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      status: 'LEFT',
    })

    assert.equal(result.success, true)
    assert.equal(result.data.name, 'Rahul Kumar')
    assert.equal(result.data.organization, undefined)
    assert.equal(result.data.property, undefined)
    assert.equal(result.data.propertyId, undefined)
    assert.equal(result.data.status, undefined)
  })

  it('rejects invalid phone numbers', () => {
    const result = updateTenantSchema.safeParse({
      phone: '123',
    })

    assert.equal(result.success, false)
  })

  it('rejects invalid gender values', () => {
    const result = updateTenantSchema.safeParse({
      gender: 'UNKNOWN',
    })

    assert.equal(result.success, false)
  })
})

describe('tenantIdParamSchema', () => {
  it('accepts a valid MongoDB ObjectId', () => {
    const result = tenantIdParamSchema.safeParse({
      tenantId: '64f1c2a1b2c3d4e5f6789012',
    })

    assert.equal(result.success, true)
  })

  it('rejects an invalid tenant ID', () => {
    const result = tenantIdParamSchema.safeParse({
      tenantId: 'not-a-valid-id',
    })

    assert.equal(result.success, false)
  })
})
