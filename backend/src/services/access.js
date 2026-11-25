import Organization from '../models/Organization.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import User from '../models/User.js'
import PropertyManagerAssignment from '../models/PropertyManagerAssignment.js'
import StaffAssignment from '../models/StaffAssignment.js'
import { checkPropertyAccess } from './tenantService.js'
import { createNotifications } from './notificationService.js'
import { deliver, getSettings } from '../messaging/deliveryService.js'

export { checkPropertyAccess }

export const createError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export const isOwner = (user) => ['BUSINESS_OWNER', 'LANDLORD'].includes(user?.role)

// Property ids this user may work with. Owners get every active property of the organisation; managers
// and staff get their assigned properties, filtered by permission when one is given.
export const accessiblePropertyIds = async (user, permission = null) => {
  if (!user?.organization) throw createError('User is not associated with an organization.', 400)

  if (isOwner(user)) {
    const properties = await Property.find({ organization: user.organization, status: 'ACTIVE' }).select('_id').lean()
    return properties.map((p) => p._id)
  }

  const Model = user.role === 'PROPERTY_MANAGER' ? PropertyManagerAssignment : user.role === 'STAFF' ? StaffAssignment : null
  if (!Model) throw createError('You do not have permission to perform this action.', 403)

  const field = user.role === 'PROPERTY_MANAGER' ? 'manager' : 'staff'
  const assignments = await Model.find({ [field]: user._id, status: 'ACTIVE' }).select('property permissions').lean()
  const required = permission ? (Array.isArray(permission) ? permission : [permission]) : null
  return assignments
    .filter((a) => !required || required.some((p) => (a.permissions || []).includes(p)))
    .map((a) => a.property)
}

// The tenant record behind a signed-in resident account.
export const tenantForUser = async (user) => {
  if (user?.role !== 'TENANT') throw createError('Only residents can do this.', 403)
  const tenant = await Tenant.findOne({ user: user._id }).populate('property', 'name address city state pincode')
  if (!tenant) throw createError('No resident record is linked to your account.', 404)
  return tenant
}

const safely = (label, fn) => fn().catch((error) => console.error(`[notify] ${label} failed:`, error.message))

// Owner plus the managers of one property, minus shared demo accounts.
export const staffRecipients = async (organization, property) => {
  const [org, managers] = await Promise.all([
    Organization.findById(organization).select('owner').lean(),
    property
      ? PropertyManagerAssignment.find({ property, status: 'ACTIVE' }).select('manager').lean()
      : Promise.resolve([]),
  ])
  const ids = [...new Set([org?.owner, ...managers.map((m) => m.manager)].filter(Boolean).map(String))]
  if (!ids.length) return []
  return User.find({ _id: { $in: ids }, isDemo: { $ne: true }, status: 'ACTIVE' }).select('name phone email').lean()
}

// In-app notification plus WhatsApp/SMS/e-mail (as switched on) to the owner and the property's managers.
// Never throws: an alert that fails must not undo the action that caused it.
// Pass external: false for an in-app note only.
export const notifyStaff = ({ organization, property, type, title, message, data = {}, vars = {}, dedupeKey, external = true }) =>
  safely(type, async () => {
    const people = await staffRecipients(organization, property)
    if (!people.length) return
    const settings = await getSettings(organization)
    if (settings.channels?.inApp !== false) {
      await createNotifications({ recipients: people.map((p) => p._id), organization, property, type, title, message, data })
    }
    if (!external) return
    await Promise.all(
      people.map((p) =>
        deliver({
          organization, property, user: p._id, type, vars,
          to: { phone: p.phone, email: p.email },
          dedupeKey: dedupeKey ? `${dedupeKey}:${p._id}` : null,
        })
      )
    )
  })

// In-app notification to one resident (only if they have an app account).
export const notifyTenantInApp = ({ tenant, type, title, message, data = {} }) =>
  safely(type, async () => {
    if (!tenant?.user) return
    const settings = await getSettings(tenant.organization)
    if (settings.channels?.inApp === false) return
    await createNotifications({
      recipients: [tenant.user], organization: tenant.organization, property: tenant.property?._id || tenant.property,
      type, title, message, data,
    })
  })

export const isDemoOrganization = async (organization) => {
  const org = await Organization.findById(organization).select('owner').lean()
  return Boolean(org?.owner && (await User.exists({ _id: org.owner, isDemo: true })))
}

export const startOfDay = (value = new Date()) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

export const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / 86400000)
