import FoodMenu, { MENU_DAYS, MENU_MEALS } from '../models/FoodMenu.js'
import Property from '../models/Property.js'
import Tenant from '../models/Tenant.js'
import { PERMISSIONS } from '../constants/permissions.js'
import { createNotifications } from './notificationService.js'
import { checkPropertyAccess, createError, isDemoOrganization, tenantForUser } from './access.js'

const emptyMenu = (property) => ({
  property,
  meals: [...MENU_MEALS],
  timings: { BREAKFAST: '', LUNCH: '', SNACKS: '', DINNER: '' },
  entries: [],
  note: '',
  updatedAt: null,
})

const findMenu = async (propertyId) => (await FoodMenu.findOne({ property: propertyId }).lean()) || emptyMenu(propertyId)

// Day key for "today" in India, where every property is.
export const todayKey = (now = new Date()) => {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(now)
  return day.slice(0, 3).toUpperCase()
}

export const getMenuForStaff = async ({ user, propertyId }) => {
  await checkPropertyAccess({ user, propertyId })
  return findMenu(propertyId)
}

export const getMenuForResident = async (user) => {
  const tenant = await tenantForUser(user)
  const propertyId = tenant.property?._id || tenant.property
  const menu = await findMenu(propertyId)
  return { ...menu, propertyName: tenant.property?.name || null, today: todayKey() }
}

// Only real menu cells are stored; blank cells are dropped so the menu stays small.
export const cleanEntries = (entries = []) => {
  const seen = new Set()
  const result = []
  for (const entry of entries) {
    const day = String(entry?.day || '').toUpperCase()
    const meal = String(entry?.meal || '').toUpperCase()
    const items = String(entry?.items || '').trim().slice(0, 200)
    if (!MENU_DAYS.includes(day) || !MENU_MEALS.includes(meal) || !items) continue
    const key = `${day}:${meal}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ day, meal, items })
  }
  return result
}

export const saveMenu = async ({ user, propertyId, data }) => {
  await checkPropertyAccess({ user, propertyId, permission: PERMISSIONS.MANAGE_FOOD_MENU })
  const property = await Property.findById(propertyId).select('name organization').lean()
  if (!property) throw createError('Property not found.', 404)

  const meals = (data.meals || MENU_MEALS).filter((m) => MENU_MEALS.includes(m))
  if (!meals.length) throw createError('Keep at least one meal in the menu.', 400)

  const menu = await FoodMenu.findOneAndUpdate(
    { property: propertyId },
    {
      $set: {
        organization: user.organization,
        meals,
        timings: Object.fromEntries(MENU_MEALS.map((m) => [m, String(data.timings?.[m] || '').trim().slice(0, 40)])),
        entries: cleanEntries(data.entries),
        note: String(data.note || '').trim().slice(0, 300),
        updatedBy: user._id,
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  ).lean()

  if (data.notifyTenants && !(await isDemoOrganization(user.organization))) {
    const residents = await Tenant.find({ property: propertyId, status: { $ne: 'LEFT' }, user: { $type: 'objectId' } }).select('user').lean()
    if (residents.length) {
      await createNotifications({
        recipients: residents.map((r) => r.user),
        organization: user.organization,
        property: propertyId,
        type: 'FOOD_MENU_UPDATED',
        title: 'Food menu updated',
        message: `The weekly food menu at ${property.name} has changed. Open "Food menu" to see it.`,
        createdBy: user._id,
      }).catch((error) => console.error('[food-menu] notify failed:', error.message))
    }
  }

  return menu
}
