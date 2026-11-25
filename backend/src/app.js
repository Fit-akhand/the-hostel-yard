import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/authRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import managerRoutes from './routes/managerRoutes.js'
import managerDirectoryRoutes from './routes/managerDirectoryRoutes.js'
import tenantRoutes from './routes/tenantRoutes.js'
import roomRoutes from './routes/roomRoutes.js'
import bedRoutes from './routes/bedRoutes.js'
import allocationRoutes from './routes/allocationRoutes.js'
import rentRoutes from './routes/rentRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import paymentSettingsRoutes from './routes/paymentSettingsRoutes.js'
import expenseRoutes from './routes/expenseRoutes.js'
import complaintRoutes from './routes/complaintRoutes.js'
import announcementRoutes from './routes/announcementRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import staffRoutes from './routes/staffRoutes.js'
import dashboardRoutes from './modules/dashboard/dashboardRoutes.js'
import reportRoutes from './modules/reports/reportRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import notificationSettingsRoutes from './routes/notificationSettingsRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import financeSettingsRoutes from './routes/financeSettingsRoutes.js'
import gatewayRoutes from './routes/gatewayRoutes.js'
import { receiptRouter, depositRouter } from './routes/receiptDepositRoutes.js'
import { employeeRouter, attendanceRouter, payrollRouter } from './routes/employeeRoutes.js'
import residentRoutes from './routes/residentRoutes.js'
import foodMenuRoutes from './routes/foodMenuRoutes.js'
import listingRoutes from './routes/listingRoutes.js'
import enquiryRoutes from './routes/enquiryRoutes.js'
import publicRoutes from './routes/publicRoutes.js'
import kycRoutes from './routes/kycRoutes.js'
import { documentRouter, templateRouter } from './routes/documentRoutes.js'
import guestPassRoutes from './routes/guestPassRoutes.js'

import {
  errorHandler,
  notFoundHandler,
} from './middlewares/errorMiddleware.js'
import { securityHeaders, sanitizeBody, sameOriginGuard } from './middlewares/securityMiddleware.js'

const app = express()

app.set('trust proxy', 1)

const toOrigin = (value) => {
  if (!value) return null
  const trimmed = value.replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

const allowedOrigins = new Set(
  [
    toOrigin(process.env.FRONTEND_URL),
    toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    toOrigin(process.env.VERCEL_URL),
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean)
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  })
)

app.use(securityHeaders)
app.use(sameOriginGuard(allowedOrigins))

// rawBody is kept so the payment webhook signature can be checked against the exact bytes received.
app.use(express.json({ limit: '200kb', verify: (req, _res, buf) => { req.rawBody = buf } }))
app.use(
  express.urlencoded({
    extended: true,
    limit: '200kb',
  })
)
app.use(sanitizeBody)
app.use(cookieParser())

// --------------------------------------------------
// AUTH
// --------------------------------------------------

app.use(
  '/api/auth',
  authRoutes
)

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message:
      'The Hostel Yard API is running',
  })
})

// --------------------------------------------------
// PROPERTY
// --------------------------------------------------

app.use(
  '/api/properties',
  propertyRoutes
)

// --------------------------------------------------
// MANAGERS
// --------------------------------------------------

app.use(
  '/api/managers',
  managerRoutes
)

// Owner-only manager list and edit routes. After the invitation routes above, so the public
// activation links keep working without a login.
app.use('/api/managers', managerDirectoryRoutes)

// --------------------------------------------------
// TENANTS
// --------------------------------------------------

app.use(
  '/api/tenants',
  tenantRoutes
)

// --------------------------------------------------
// ROOMS
// --------------------------------------------------

app.use(
  '/api/rooms',
  roomRoutes
)

// --------------------------------------------------
// BEDS
// --------------------------------------------------

app.use(
  '/api/beds',
  bedRoutes
)

// --------------------------------------------------
// ALLOCATIONS
// --------------------------------------------------

app.use(
  '/api/allocations',
  allocationRoutes
)

app.use('/api/bookings', bookingRoutes)

// --------------------------------------------------
// RENT
// --------------------------------------------------

app.use(
  '/api/rent',
  rentRoutes
)

app.use(
  '/api/expenses',
  expenseRoutes
)

// --------------------------------------------------
// PAYMENTS
// --------------------------------------------------

app.use(
  '/api/payments',
  paymentRoutes
)

app.use(
  '/api/payment-settings',
  paymentSettingsRoutes
)

app.use(
  '/api/complaints',
  complaintRoutes
)

app.use(
  '/api/announcements',
  announcementRoutes
)

app.use(
  '/api/staff',
  staffRoutes
)

app.use(
  '/api/dashboard',
  dashboardRoutes
)

app.use('/api/reports', reportRoutes)

app.use(
  '/api/notifications',
  notificationRoutes
)

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

app.use('/api/notification-settings', notificationSettingsRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/finance-settings', financeSettingsRoutes)
app.use('/api/gateway', gatewayRoutes)
app.use('/api/receipts', receiptRouter)
app.use('/api/deposits', depositRouter)
app.use('/api/employees', employeeRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/payroll', payrollRouter)
app.use('/api/me', residentRoutes)
app.use('/api/food-menu', foodMenuRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/enquiries', enquiryRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/tenants', kycRoutes)
app.use('/api/documents', documentRouter)
app.use('/api/document-templates', templateRouter)
app.use('/api/guest-passes', guestPassRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app