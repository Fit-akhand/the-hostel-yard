import Allocation from '../models/Allocation.js'
import Bed from '../models/Bed.js'
import Enquiry from '../models/Enquiry.js'
import FoodMenu from '../models/FoodMenu.js'
import Organization from '../models/Organization.js'
import Property from '../models/Property.js'
import PropertyListing, { ROOM_TYPES } from '../models/PropertyListing.js'
import Room from '../models/Room.js'
import Tenant from '../models/Tenant.js'
import { normalizePhone } from '../messaging/phone.js'
import { createError, isOwner, notifyStaff } from './access.js'

// "Sunrise PG, Sector 58" -> "sunrise-pg-sector-58"
export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'pg'

const uniqueSlug = async (base, taken) => {
  let slug = base
  for (let n = 2; await taken(slug); n += 1) slug = `${base}-${n}`.slice(0, 60)
  return slug
}

const ensureOrgSlug = async (organizationId) => {
  const org = await Organization.findById(organizationId).select('name publicSlug')
  if (!org) throw createError('Organization not found.', 404)
  if (org.publicSlug) return org.publicSlug
  org.publicSlug = await uniqueSlug(slugify(org.name), (slug) => Organization.exists({ publicSlug: slug, _id: { $ne: org._id } }))
  await org.save()
  return org.publicSlug
}

const defaultListing = (property) => ({
  property: property._id,
  published: false,
  slug: slugify(property.name),
  audience: 'ANY',
  headline: '',
  description: '',
  amenities: [],
  rentFrom: { SINGLE: null, DOUBLE: null, TRIPLE: null, DORMITORY: null },
  contactPhone: '',
  showFoodMenu: true,
  mapUrl: '',
})

// Free beds now and beds that free up soon (their resident is on notice), per room type.
export const vacancySummary = async (propertyId) => {
  const rooms = await Room.find({ property: propertyId, status: 'ACTIVE' }).select('type').lean()
  const roomType = new Map(rooms.map((r) => [String(r._id), r.type]))
  const roomIds = rooms.map((r) => r._id)

  const [freeBeds, leaving] = await Promise.all([
    Bed.find({ property: propertyId, room: { $in: roomIds }, status: 'AVAILABLE' }).select('room').lean(),
    Allocation.find({ property: propertyId, room: { $in: roomIds }, status: 'ACTIVE' }).select('room tenant').lean(),
  ])

  const onNotice = leaving.length
    ? await Tenant.find({ _id: { $in: leaving.map((a) => a.tenant) }, status: 'NOTICE_PERIOD', expectedMoveOutDate: { $ne: null } })
        .select('expectedMoveOutDate')
        .lean()
    : []
  const leavingOn = new Map(onNotice.map((t) => [String(t._id), t.expectedMoveOutDate]))

  const byType = Object.fromEntries(ROOM_TYPES.map((type) => [type, { type, available: 0, upcoming: 0, nextFreeOn: null }]))
  for (const bed of freeBeds) {
    const type = roomType.get(String(bed.room))
    if (byType[type]) byType[type].available += 1
  }
  for (const allocation of leaving) {
    const date = leavingOn.get(String(allocation.tenant))
    const type = roomType.get(String(allocation.room))
    if (!date || !byType[type]) continue
    byType[type].upcoming += 1
    if (!byType[type].nextFreeOn || date < byType[type].nextFreeOn) byType[type].nextFreeOn = date
  }

  const types = Object.values(byType).filter((t) => rooms.some((r) => r.type === t.type))
  return {
    types,
    available: types.reduce((sum, t) => sum + t.available, 0),
    upcoming: types.reduce((sum, t) => sum + t.upcoming, 0),
  }
}

// --------------------------------------------------
// OWNER SIDE
// --------------------------------------------------

export const getListings = async (user) => {
  if (!isOwner(user)) throw createError('Only the owner can change the public page.', 403)
  const [properties, listings, org] = await Promise.all([
    Property.find({ organization: user.organization, status: 'ACTIVE' }).select('name city state address type').sort({ name: 1 }).lean(),
    PropertyListing.find({ organization: user.organization }).lean(),
    Organization.findById(user.organization).select('publicSlug name').lean(),
  ])
  const byProperty = new Map(listings.map((l) => [String(l.property), l]))

  const items = await Promise.all(
    properties.map(async (property) => ({
      property,
      listing: byProperty.get(String(property._id)) || defaultListing(property),
      vacancy: await vacancySummary(property._id),
    }))
  )
  return { orgSlug: org?.publicSlug || null, organizationName: org?.name, items }
}

const cleanRent = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export const saveListing = async ({ user, propertyId, data }) => {
  if (!isOwner(user)) throw createError('Only the owner can change the public page.', 403)
  const property = await Property.findOne({ _id: propertyId, organization: user.organization, status: 'ACTIVE' }).select('name').lean()
  if (!property) throw createError('Property not found.', 404)

  const orgSlug = await ensureOrgSlug(user.organization)
  const existing = await PropertyListing.findOne({ property: propertyId })
  const wanted = slugify(data.slug || existing?.slug || property.name)
  const slug = await uniqueSlug(wanted, (s) => PropertyListing.exists({ organization: user.organization, slug: s, property: { $ne: propertyId } }))

  const update = {
    organization: user.organization,
    slug,
    published: Boolean(data.published),
    audience: ['BOYS', 'GIRLS', 'ANY'].includes(data.audience) ? data.audience : 'ANY',
    headline: String(data.headline || '').trim().slice(0, 120),
    description: String(data.description || '').trim().slice(0, 2000),
    amenities: [...new Set((data.amenities || []).map((a) => String(a).trim()).filter(Boolean))].slice(0, 30).map((a) => a.slice(0, 40)),
    rentFrom: Object.fromEntries(ROOM_TYPES.map((type) => [type, cleanRent(data.rentFrom?.[type])])),
    contactPhone: String(data.contactPhone || '').trim().slice(0, 20),
    showFoodMenu: data.showFoodMenu !== false,
    mapUrl: /^https:\/\//.test(String(data.mapUrl || '')) ? String(data.mapUrl).trim().slice(0, 500) : '',
  }

  const listing = await PropertyListing.findOneAndUpdate({ property: propertyId }, { $set: update }, {
    upsert: true, returnDocument: 'after', runValidators: true,
  }).lean()
  return { listing, orgSlug }
}

// --------------------------------------------------
// PUBLIC SIDE (no sign-in)
// --------------------------------------------------

const publicOrg = async (orgSlug) => {
  const org = await Organization.findOne({ publicSlug: String(orgSlug || '').toLowerCase() }).select('name phone email publicSlug logo').lean()
  if (!org) throw createError('This page does not exist.', 404)
  return org
}

const publicCard = (property, listing, vacancy) => ({
  slug: listing.slug,
  name: property.name,
  city: property.city,
  state: property.state,
  type: property.type,
  audience: listing.audience,
  headline: listing.headline,
  amenities: listing.amenities.slice(0, 6),
  available: vacancy.available,
  upcoming: vacancy.upcoming,
  rentFrom: Math.min(...ROOM_TYPES.map((t) => listing.rentFrom?.[t]).filter((n) => n > 0)) || null,
})

export const getPublicOrganization = async (orgSlug) => {
  const org = await publicOrg(orgSlug)
  const listings = await PropertyListing.find({ organization: org._id, published: true }).lean()
  const properties = await Property.find({ _id: { $in: listings.map((l) => l.property) }, status: 'ACTIVE' }).select('name city state type').lean()
  const byId = new Map(properties.map((p) => [String(p._id), p]))

  const cards = []
  for (const listing of listings) {
    const property = byId.get(String(listing.property))
    if (!property) continue
    cards.push(publicCard(property, listing, await vacancySummary(property._id)))
  }
  cards.sort((a, b) => b.available - a.available || a.name.localeCompare(b.name))

  return { organization: { name: org.name, slug: org.publicSlug, phone: org.phone }, properties: cards }
}

const findPublicListing = async (orgSlug, propertySlug) => {
  const org = await publicOrg(orgSlug)
  const listing = await PropertyListing.findOne({ organization: org._id, slug: String(propertySlug || '').toLowerCase(), published: true }).lean()
  if (!listing) throw createError('This page does not exist.', 404)
  const property = await Property.findOne({ _id: listing.property, status: 'ACTIVE' }).select('name address city state pincode type').lean()
  if (!property) throw createError('This page does not exist.', 404)
  return { org, listing, property }
}

export const getPublicProperty = async (orgSlug, propertySlug) => {
  const { org, listing, property } = await findPublicListing(orgSlug, propertySlug)
  const [vacancy, menu] = await Promise.all([
    vacancySummary(property._id),
    listing.showFoodMenu ? FoodMenu.findOne({ property: property._id }).select('meals timings entries note').lean() : null,
  ])

  return {
    organization: { name: org.name, slug: org.publicSlug },
    property: {
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
      type: property.type,
    },
    listing: {
      slug: listing.slug,
      audience: listing.audience,
      headline: listing.headline,
      description: listing.description,
      amenities: listing.amenities,
      rentFrom: listing.rentFrom,
      contactPhone: listing.contactPhone || org.phone || '',
      mapUrl: listing.mapUrl,
    },
    vacancy,
    foodMenu: menu?.entries?.length ? menu : null,
  }
}

export const createPublicEnquiry = async ({ orgSlug, propertySlug, data }) => {
  const { org, property } = await findPublicListing(orgSlug, propertySlug)

  const phone = normalizePhone(data.phone)
  if (!phone) throw createError('Enter a valid 10-digit mobile number.', 400)

  // The same number asking again within a day updates the open enquiry instead of adding a duplicate.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const duplicate = await Enquiry.findOne({ property: property._id, phone, createdAt: { $gte: since } })
  if (duplicate) {
    if (data.message) duplicate.notes.push({ text: `Asked again: ${String(data.message).slice(0, 900)}`, byName: duplicate.name })
    await duplicate.save()
    return { enquiry: duplicate, duplicate: true }
  }

  const enquiry = await Enquiry.create({
    organization: org._id,
    property: property._id,
    name: data.name,
    phone,
    email: data.email || null,
    gender: data.gender || null,
    sharing: data.sharing || null,
    moveInDate: data.moveInDate || null,
    message: data.message || '',
    source: 'WEBSITE',
  })

  notifyStaff({
    organization: org._id,
    property: property._id,
    type: 'ENQUIRY_NEW',
    title: 'New enquiry',
    message: `${enquiry.name} (${enquiry.phone}) asked about ${property.name}.`,
    data: { enquiryId: enquiry._id },
    vars: { property: property.name, name: enquiry.name, phone: enquiry.phone, sharing: enquiry.sharing, moveInDate: enquiry.moveInDate, message: enquiry.message?.slice(0, 160) },
    dedupeKey: `enquiry:${enquiry._id}`,
  })

  return { enquiry, duplicate: false }
}
