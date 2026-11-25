import crypto from 'crypto'

import Tenant from '../models/Tenant.js'
import TenantLink from '../models/TenantLink.js'
import SignedDocument from '../models/SignedDocument.js'
import { deliver } from '../messaging/deliveryService.js'
import { normalizePhone } from '../messaging/phone.js'
import { createError, isDemoOrganization } from './access.js'
import { KYC_MANAGE_PERMISSIONS, loadTenantForStaff } from './kycService.js'

export const LINK_DAYS = 14

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

// A private link for one resident: resident form, ID upload and documents to sign. A new link switches
// off the previous one, so only the latest link sent works.
export const createTenantLink = async ({ user, tenantId, send = false }) => {
  const tenant = await loadTenantForStaff(user, tenantId, KYC_MANAGE_PERMISSIONS)
  if (tenant.status === 'LEFT') throw createError('This resident has moved out.', 400)

  await TenantLink.updateMany({ tenant: tenant._id, revokedAt: null }, { $set: { revokedAt: new Date() } })

  const token = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000)
  await TenantLink.create({ organization: tenant.organization, tenant: tenant._id, tokenHash: hashToken(token), expiresAt, createdBy: user._id })

  const url = `${frontendUrl()}/r/${token}`
  const waiting = await SignedDocument.exists({ tenant: tenant._id, kind: 'AGREEMENT', status: 'SENT' })
  const needsForm = !['SUBMITTED', 'VERIFIED'].includes(tenant.kyc?.status)
  const type = needsForm || !waiting ? 'RESIDENT_FORM_LINK' : 'DOCUMENT_TO_SIGN'

  let sent = []
  if (send && !(await isDemoOrganization(tenant.organization))) {
    sent = await deliver({
      organization: tenant.organization,
      property: tenant.property._id,
      tenant: tenant._id,
      type,
      vars: { name: tenant.name.split(' ')[0], property: tenant.property.name, link: url, document: 'licence agreement' },
      to: { phone: tenant.phone, email: tenant.email },
      redact: [url],
    })
  }

  return {
    url,
    expiresAt,
    purpose: type === 'DOCUMENT_TO_SIGN' ? 'SIGN' : 'FORM',
    hasValidPhone: Boolean(normalizePhone(tenant.phone)),
    sent: sent.map((s) => ({ channel: s.channel, status: s.status })),
  }
}

export const resolveTenantLink = async (token) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''))) throw createError('This link is not valid.', 404)
  const link = await TenantLink.findOne({ tokenHash: hashToken(token) })
  if (!link || link.revokedAt) throw createError('This link is no longer active. Ask the management for a new one.', 410)
  if (link.expiresAt < new Date()) throw createError('This link has expired. Ask the management for a new one.', 410)

  const tenant = await Tenant.findById(link.tenant).populate('property', 'name address city state pincode')
  if (!tenant || tenant.status === 'LEFT') throw createError('This link is no longer active.', 410)

  if (!link.lastOpenedAt || Date.now() - link.lastOpenedAt.getTime() > 60 * 1000) {
    link.lastOpenedAt = new Date()
    await link.save()
  }
  return tenant
}

export const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length >= 4 ? `******${digits.slice(-4)}` : ''
}
