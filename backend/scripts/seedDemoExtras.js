// Demo data for the resident form, agreements, guest passes, food menu, enquiries and public pages.
import Organization from '../src/models/Organization.js'
import Tenant from '../src/models/Tenant.js'
import StoredFile from '../src/models/StoredFile.js'
import FoodMenu from '../src/models/FoodMenu.js'
import PropertyListing from '../src/models/PropertyListing.js'
import Enquiry from '../src/models/Enquiry.js'
import GuestPass from '../src/models/GuestPass.js'
import { submitResidentForm } from '../src/services/kycService.js'
import { createAgreement, signAsOwner, signAsTenant, suggestedTerms } from '../src/services/signingService.js'
import { slugify } from '../src/services/listingService.js'
import { addDays, todayInIndia } from '../src/utils/passRules.js'
import { sampleFile, signatureImage } from './demoImages.js'

const MENU = {
  BREAKFAST: ['Poha, tea', 'Aloo paratha, curd', 'Idli, sambar', 'Bread omelette, tea', 'Upma, banana', 'Puri sabzi', 'Chole bhature'],
  LUNCH: ['Dal, rice, roti, bhindi', 'Rajma, rice, salad', 'Kadhi, rice, roti', 'Chole, rice, roti', 'Dal makhani, jeera rice', 'Veg pulao, raita', 'Paneer, roti, rice'],
  SNACKS: ['Samosa, tea', 'Biscuits, coffee', 'Pakoda, tea', 'Sandwich', 'Maggi', 'Fruit chaat', 'Bhel puri'],
  DINNER: ['Mix veg, roti, dal', 'Egg curry or paneer, roti', 'Aloo gobi, roti, dal', 'Fried rice, manchurian', 'Matar paneer, roti', 'Khichdi, papad', 'Special: biryani, raita'],
}
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const context = { ip: '203.0.113.10', userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0', verifiedBy: 'LINK', phoneLast4: '0000' }

const sign = (name, n) => ({ signature: signatureImage(n), name, consent: true })

const fillKyc = async (org, tenantId, n) => {
  const tenant = await Tenant.findById(tenantId).populate('property', 'name address city state pincode')
  Object.assign(tenant.kyc.details, {
    fatherName: `Mr. ${tenant.name.split(' ').slice(-1)[0]}`, dateOfBirth: new Date(2002, n % 12, 10), bloodGroup: ['A+', 'B+', 'O+', 'AB+'][n % 4],
    permanentAddress: `${12 + n}, Civil Lines (sample address)`, city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001',
    occupation: 'STUDENT', institution: 'Sample Institute of Technology', courseOrDesignation: 'B.Tech, 3rd year',
    guardianName: `Mrs. ${tenant.name.split(' ').slice(-1)[0]}`, guardianPhone: '9000099999', guardianRelation: 'Mother', idType: 'AADHAAR', idLast4: String(1000 + n * 37).slice(-4),
  })
  for (const kind of ['PHOTO', 'ID_FRONT']) {
    const data = sampleFile(kind)
    const file = await StoredFile.create({ organization: org._id, data, mimeType: 'image/png', bytes: data.length })
    tenant.kyc.documents.push({ kind, storage: 'database', fileId: file._id, mimeType: 'image/png', bytes: data.length, originalName: 'sample.png', uploadedVia: 'RESIDENT' })
  }
  await tenant.save()
  return tenant
}

export const seedExtras = async ({ org, owner, props, allTenants, demoTenant }) => {
  await Organization.updateOne({ _id: org._id }, { $set: { publicSlug: 'the-hostel-yard-demo' } })

  // --- food menu and public pages ----------------------------------------------------------------
  const rents = { 0: [8500, 9500, 11000], 1: [9000, 10500, 12000], 2: [11000, 13500, 16000] }
  const order = ['Sunrise Boys PG', 'Lotus Girls PG', 'Urban Nest Co-living']
  for (const property of props) {
    const i = Math.max(0, order.indexOf(property.name))
    await FoodMenu.create({
      organization: org._id, property: property._id,
      timings: { BREAKFAST: '7:30 - 9:30 AM', LUNCH: '12:30 - 2:30 PM', SNACKS: '5:00 - 6:00 PM', DINNER: '8:00 - 10:00 PM' },
      entries: Object.entries(MENU).flatMap(([meal, items]) => DAYS.map((day, d) => ({ day, meal, items: items[(d + i) % 7] }))),
      note: 'Sunday dinner is special.', updatedBy: owner._id,
    })
    await PropertyListing.create({
      organization: org._id, property: property._id, published: true, slug: slugify(property.name), audience: ['BOYS', 'GIRLS', 'ANY'][i],
      headline: ['Furnished rooms near the metro', 'Safe, furnished stay for girls', 'Co-living with work space'][i],
      description: 'Sample listing for the demo. Furnished rooms with food, Wi-Fi and daily housekeeping.',
      amenities: ['Wi-Fi', 'AC', 'Food included', 'Laundry', 'Housekeeping', 'CCTV', 'Power backup'],
      rentFrom: { SINGLE: rents[i][0], DOUBLE: rents[i][1], TRIPLE: rents[i][2] }, contactPhone: '9000000001',
    })
  }

  // --- enquiries ---------------------------------------------------------------------------------
  const leads = [
    ['Aman Tiwari', 'NEW', 'WEBSITE', 'DOUBLE'], ['Priya Saxena', 'NEW', 'WHATSAPP', 'SINGLE'], ['Rohit Bansal', 'CONTACTED', 'PHONE', 'TRIPLE'],
    ['Sneha Reddy', 'VISIT_SCHEDULED', 'WEBSITE', 'DOUBLE'], ['Mohit Verma', 'CONTACTED', 'REFERRAL', 'ANY'], ['Nisha Iyer', 'LOST', 'WALK_IN', 'SINGLE'], ['Farhan Ali', 'NEW', 'WEBSITE', 'DOUBLE'],
  ]
  for (const [i, [name, status, source, sharing]] of leads.entries()) {
    await Enquiry.create({
      organization: org._id, property: props[i % props.length]._id, name, phone: `+9190000${String(20000 + i)}`, status, source, sharing,
      moveInDate: new Date(Date.now() + (i + 3) * 864e5), message: i % 2 ? 'Is food included in the rent?' : 'I want to visit this weekend.',
      visitOn: status === 'VISIT_SCHEDULED' ? new Date(Date.now() + 2 * 864e5) : null,
      followUpOn: status === 'CONTACTED' ? new Date() : null,
      lostReason: status === 'LOST' ? 'Chose a place closer to office' : null,
      notes: status === 'NEW' ? [] : [{ text: 'Spoke on the phone and shared the rent details.', by: owner._id, byName: owner.name }],
    })
  }

  // --- guest passes ------------------------------------------------------------------------------
  const today = todayInIndia()
  const hosts = [demoTenant, ...allTenants.filter((x) => String(x.t._id) !== String(demoTenant.t._id) && String(x.prop._id) === String(demoTenant.prop._id)).slice(0, 6)]
  const visits = [
    // Pending and upcoming visits are dated ahead so the demo still shows them days after seeding.
    [0, 'Rajesh Kumar', 'Parent', 'PENDING', 10], [0, 'Vikram Joshi', 'Friend', 'APPROVED', 7], [0, 'Anita Devi', 'Parent', 'CHECKED_OUT', -3],
    [1, 'Suresh Mehta', 'Relative', 'CHECKED_IN', 0], [2, 'Pooja Nair', 'Friend', 'APPROVED', 0], [3, 'Courier Partner', 'Delivery', 'PENDING', 5],
    [4, 'Karan Malhotra', 'Friend', 'REJECTED', -1], [5, 'Deepa Chopra', 'Brother / Sister', 'CHECKED_OUT', -2],
  ]
  for (const [i, [host, visitorName, relation, status, offset]] of visits.entries()) {
    const x = hosts[host % hosts.length]
    const day = addDays(today, offset)
    const at = new Date(`${day}T11:00:00+05:30`)
    await GuestPass.create({
      organization: org._id, property: x.prop._id, tenant: x.t._id, visitorName, relation, visitorPhone: `+9190000${String(30000 + i)}`,
      visitDate: day, expectedTime: '17:00', status, source: i % 2 ? 'GATE_QR' : 'STAFF', purpose: 'Visit',
      code: ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(status) ? String(482100 + i * 7) : null,
      decidedAt: status === 'PENDING' ? null : at, decidedVia: status === 'PENDING' ? null : 'APP',
      checkedInAt: ['CHECKED_IN', 'CHECKED_OUT'].includes(status) ? at : null,
      checkedOutAt: status === 'CHECKED_OUT' ? new Date(at.getTime() + 2 * 36e5) : null,
    })
  }

  // --- resident forms and agreements -------------------------------------------------------------
  const others = allTenants.filter((x) => String(x.t._id) !== String(demoTenant.t._id))
  const termsFor = async (tenant) => {
    const terms = await suggestedTerms(tenant)
    return { ...terms, deposit: terms.deposit || terms.monthlyRent }
  }
  const cases = [[demoTenant, 'VERIFIED', 'COMPLETED'], [others[0], 'VERIFIED', 'TENANT_SIGNED'], [others[1], 'SUBMITTED', 'SENT'], [others[2], 'SUBMITTED', null], [others[3], 'REJECTED', null]]
  for (const [n, [x, kyc, agreement]] of cases.entries()) {
    const tenant = await fillKyc(org, x.t._id, n + 1)
    await submitResidentForm(tenant, sign(tenant.name, n + 1), context)
    if (kyc !== 'SUBMITTED') {
      tenant.kyc.status = kyc
      tenant.kyc.reviewedAt = new Date()
      tenant.kyc.reviewedBy = owner._id
      tenant.kyc.rejectionReason = kyc === 'REJECTED' ? 'The ID photo is not clear. Please upload it again.' : null
      if (kyc === 'VERIFIED') tenant.kyc.police = { status: n ? 'SUBMITTED' : 'VERIFIED', station: 'Sector 58 Police Station', referenceNumber: `TV-${4100 + n}`, submittedOn: new Date(), verifiedOn: n ? null : new Date() }
      await tenant.save()
    }
    if (!agreement) continue
    const doc = await createAgreement({ user: owner, tenantId: tenant._id, terms: await termsFor(tenant) })
    if (agreement === 'SENT') continue
    await signAsTenant(tenant, doc._id, sign(tenant.name, n + 11), context)
    if (agreement === 'COMPLETED') await signAsOwner({ user: owner, id: doc._id, input: sign(owner.name, 7), context })
  }

  return { enquiries: leads.length, guestPasses: visits.length, residentForms: cases.length }
}
