import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/authRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import managerRoutes from './routes/managerRoutes.js'
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

import {
  errorHandler,
  notFoundHandler,
} from './middlewares/errorMiddleware.js'

const app = express()

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  })
)
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

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

app.use(notFoundHandler)
app.use(errorHandler)

export default app