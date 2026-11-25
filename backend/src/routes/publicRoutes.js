import express from 'express'
import { z } from 'zod'

import { validate } from '../middlewares/validateMiddleware.js'
import { rateLimit, byBodyField, byIp, HOUR, MINUTE } from '../middlewares/rateLimit.js'
import { handle, optionalDate, phoneField } from '../utils/http.js'
import { createPublicEnquiry, getPublicOrganization, getPublicProperty } from '../services/listingService.js'
import { resolveTenantLink } from '../services/tenantLinkService.js'
import { residentDocsRouter } from './residentDocsRouter.js'
import { decideByLink, getApproval, getGateInfo, getVisitorPass, requestVisit } from '../services/guestPassService.js'
import { decisionSchema, visitSchema } from './guestPassRoutes.js'

// Pages anyone can open without signing in: the vacancy page and its enquiry form.
const router = express.Router()

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,60}$/)
const readLimit = rateLimit({ name: 'public-read', windowMs: MINUTE, max: 60, key: byIp })
const enquiryIpLimit = rateLimit({
  name: 'public-enquiry-ip',
  windowMs: HOUR,
  max: 6,
  message: 'Too many enquiries from this network. Please call us instead, or try again in an hour.',
})
const enquiryPhoneLimit = rateLimit({
  name: 'public-enquiry-phone',
  windowMs: 24 * HOUR,
  max: 4,
  key: byBodyField('phone'),
  message: 'We already have your enquiry and will call you soon.',
})

const checkSlugs = (req, res, next) => {
  const ok = slug.safeParse(req.params.orgSlug).success && (!req.params.propertySlug || slug.safeParse(req.params.propertySlug).success)
  if (!ok) return res.status(404).json({ success: false, message: 'This page does not exist.' })
  return next()
}

router.get('/stays/:orgSlug', readLimit, checkSlugs, handle((req) => getPublicOrganization(req.params.orgSlug)))
router.get('/stays/:orgSlug/:propertySlug', readLimit, checkSlugs, handle((req) => getPublicProperty(req.params.orgSlug, req.params.propertySlug)))

router.post(
  '/stays/:orgSlug/:propertySlug/enquiries',
  checkSlugs,
  enquiryIpLimit,
  validate(z.object({
    name: z.string().trim().min(2, 'Enter your name.').max(100),
    phone: phoneField,
    email: z.string().trim().email('Enter a valid email.').max(120).optional().or(z.literal('')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().or(z.literal('')),
    sharing: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY', 'ANY']).optional().or(z.literal('')),
    moveInDate: optionalDate,
    message: z.string().trim().max(1000).optional(),
    // Hidden field that people never fill; bots usually do.
    website: z.string().max(200).optional(),
  }).strict()),
  enquiryPhoneLimit,
  handle(async (req) => {
    if (req.body.website) return { received: true }
    const { website, ...data } = req.body
    const clean = { ...data, gender: data.gender || null, sharing: data.sharing || null, email: data.email || null }
    const { duplicate } = await createPublicEnquiry({ orgSlug: req.params.orgSlug, propertySlug: req.params.propertySlug, data: clean })
    return { received: true, duplicate }
  }, { status: 201, message: 'Thank you! We will call you soon.' })
)

// Guest passes: the gate QR form, the visitor's pass page, and the resident's approval link.
const visitIpLimit = rateLimit({
  name: 'visit-ip', windowMs: HOUR, max: 10,
  message: 'Too many visit requests from this network. Please ask at the gate.',
})
const visitResidentLimit = rateLimit({
  name: 'visit-resident', windowMs: HOUR, max: 6, key: byBodyField('residentPhone'),
  message: 'This resident has several requests waiting. Please call them, or try again in an hour.',
})
// The pass page checks for the answer every few seconds.
const passLimit = rateLimit({ name: 'visit-pass', windowMs: 15 * MINUTE, max: 300, key: byIp })
const approveLimit = rateLimit({ name: 'visit-approve', windowMs: 15 * MINUTE, max: 60, key: byIp })

router.get('/visit/:code', readLimit, handle((req) => getGateInfo(req.params.code)))
router.post(
  '/visit/:code',
  visitIpLimit,
  validate(visitSchema.extend({ residentPhone: phoneField })),
  visitResidentLimit,
  handle((req) => requestVisit(req.params.code, req.body), { status: 201, message: 'Request sent.' })
)
router.get('/pass/:token', passLimit, handle((req) => getVisitorPass(req.params.token)))
router.get('/approve/:token', approveLimit, handle((req) => getApproval(req.params.token)))
router.post('/approve/:token', approveLimit, validate(decisionSchema), handle((req) => decideByLink(req.params.token, req.body), { message: 'Saved.' }))

// A resident's private link: resident form, ID upload and documents to sign, without an app account.
const linkLimit = rateLimit({ name: 'resident-link', windowMs: 15 * MINUTE, max: 120, key: byIp })
router.use(
  '/resident/:token',
  linkLimit,
  residentDocsRouter({ resolveTenant: (req) => resolveTenantLink(req.params.token), verifiedBy: 'LINK' })
)

export default router
