import Deposit from '../models/Deposit.js'
import Tenant from '../models/Tenant.js'
import RentDue from '../models/RentDue.js'
import Payment from '../models/Payment.js'
import Property from '../models/Property.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { nextReceiptNumber } from './receiptNumber.js'

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const pad = (n) => String(n).padStart(2, '0')
const todayText = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// Owners may do everything. Managers need the tenant permission on the property.
const assertAccess = async (user, propertyId, write) => {
  if (!user.organization) throw fail('User is not associated with an organization.')
  if (user.role === 'BUSINESS_OWNER') return
  if (user.role === 'PROPERTY_MANAGER') {
    const a = await PropertyManagerAssignment.findOne({ manager: user._id, property: propertyId, status: 'ACTIVE' })
    if (a?.permissions.includes(write ? PERMISSIONS.EDIT_TENANTS : PERMISSIONS.VIEW_TENANTS)) return
  }
  throw fail('You do not have permission to do this.', 403)
}

const loadTenant = async (user, tenantId) => {
  const tenant = await Tenant.findOne({ _id: tenantId, organization: user.organization })
  if (!tenant) throw fail('Tenant not found.', 404)
  return tenant
}

export const listDeposits = async ({ user, propertyId }) => {
  if (!user.organization) throw fail('User is not associated with an organization.')
  const filter = { organization: user.organization }
  if (propertyId) { await assertAccess(user, propertyId, false); filter.property = propertyId }
  else if (user.role !== 'BUSINESS_OWNER') {
    const rows = await PropertyManagerAssignment.find({ manager: user._id, status: 'ACTIVE', permissions: PERMISSIONS.VIEW_TENANTS }).select('property')
    filter.property = { $in: rows.map((r) => r.property) }
  }
  return Deposit.find(filter).populate('tenant', 'name phone status').populate('property', 'name').sort({ createdAt: -1 })
}

export const getTenantDeposit = async ({ user, tenantId }) => {
  const tenant = await loadTenant(user, tenantId)
  await assertAccess(user, tenant.property, false)
  return Deposit.findOne({ tenant: tenantId })
}

export const saveDeposit = async ({ user, tenantId, data }) => {
  const tenant = await loadTenant(user, tenantId)
  await assertAccess(user, tenant.property, true)
  const existing = await Deposit.findOne({ tenant: tenantId })
  if (existing?.status === 'SETTLED') throw fail('This deposit has already been settled.', 409)
  if (existing) { Object.assign(existing, data); await existing.save(); return existing }
  return Deposit.create({ ...data, organization: user.organization, property: tenant.property, tenant: tenantId, recordedBy: user._id })
}

// What would happen if the tenant were settled now. Dues are taken from the deposit, oldest first.
export const buildSettlement = ({ depositAmount, dues, deductions = [] }) => {
  const deductionsTotal = deductions.reduce((t, d) => t + d.amount, 0)
  const sorted = [...dues].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  let available = depositAmount
  const adjustments = []

  // Fixed deductions (damages, keys...) come out of the deposit first, then unpaid rent.
  available -= Math.min(available, deductionsTotal)
  for (const due of sorted) {
    const owed = due.amount - due.paidAmount
    const take = Math.min(available, owed)
    if (take > 0) adjustments.push({ dueId: due._id, billingMonth: due.billingMonth, amount: take, fullyCleared: take === owed })
    available -= take
  }

  const unpaidRent = sorted.reduce((t, d) => t + (d.amount - d.paidAmount), 0)
  const rentAdjusted = adjustments.reduce((t, a) => t + a.amount, 0)
  const stillOwed = Math.max(0, deductionsTotal - depositAmount) + Math.max(0, unpaidRent - rentAdjusted)
  return { deductionsTotal, unpaidRent, rentAdjusted, adjustments, refundAmount: Math.max(0, available), stillOwed }
}

const openDues = (organization, tenantId) =>
  RentDue.find({ organization, tenant: tenantId, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }).sort({ dueDate: 1 })

export const previewSettlement = async ({ user, tenantId, deductions = [] }) => {
  const tenant = await loadTenant(user, tenantId)
  await assertAccess(user, tenant.property, false)
  const deposit = await Deposit.findOne({ tenant: tenantId })
  if (!deposit) throw fail('No security deposit is recorded for this tenant.', 404)
  const dues = await openDues(user.organization, tenantId)
  return { tenant: { _id: tenant._id, name: tenant.name, status: tenant.status }, deposit, dues, ...buildSettlement({ depositAmount: deposit.amount, dues, deductions }) }
}

export const settleDeposit = async ({ user, tenantId, deductions = [], refundMethod, settledOn }) => {
  const tenant = await loadTenant(user, tenantId)
  await assertAccess(user, tenant.property, true)
  if (tenant.status === 'ACTIVE') throw fail('Start the notice period (or move the tenant out) before settling the deposit.', 409)

  const deposit = await Deposit.findOne({ tenant: tenantId })
  if (!deposit) throw fail('No security deposit is recorded for this tenant.', 404)
  if (deposit.status === 'SETTLED') throw fail('This deposit has already been settled.', 409)

  const dues = await openDues(user.organization, tenantId)
  const result = buildSettlement({ depositAmount: deposit.amount, dues, deductions })

  // Rent paid out of the deposit is recorded as a normal verified payment, so dues, receipts and reports stay right.
  for (const adj of result.adjustments) {
    const due = dues.find((d) => String(d._id) === String(adj.dueId))
    await Payment.create({
      organization: user.organization, property: tenant.property, tenant: tenant._id, rentDue: due._id, amount: adj.amount,
      method: 'CASH', status: 'VERIFIED', paymentDate: new Date(), notes: 'Adjusted from security deposit',
      recordedBy: user._id, verifiedBy: user._id, verifiedAt: new Date(), receiptNumber: await nextReceiptNumber(user.organization),
    })
    due.paidAmount += adj.amount
    due.status = due.paidAmount >= due.amount ? 'PAID' : 'PARTIAL'
    await due.save()
  }

  deposit.status = 'SETTLED'
  deposit.settlement = {
    settledOn: settledOn || todayText(), rentAdjusted: result.rentAdjusted, deductions, deductionsTotal: result.deductionsTotal,
    refundAmount: result.refundAmount, refundMethod: result.refundAmount > 0 ? refundMethod || 'CASH' : null,
    stillOwed: result.stillOwed, settledBy: user._id,
  }
  await deposit.save()
  return deposit
}
