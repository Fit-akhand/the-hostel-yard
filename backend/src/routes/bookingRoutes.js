import express from 'express'

import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  confirmBooking,
  cancelBooking,
  completeBooking,
  expirePendingBookings,
  deleteBooking,
} from '../controllers/bookingController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createBookingSchema,
  updateBookingSchema,
  bookingIdParamsSchema,
  listBookingsQuerySchema,
  cancelBookingSchema,
} from '../validators/bookingValidator.js'

const router = express.Router()

router.use(protect)

router.get(
  '/',
  validateQuery(listBookingsQuerySchema),
  getBookings
)

router.post(
  '/',
  validate(createBookingSchema),
  createBooking
)

router.post(
  '/expire',
  expirePendingBookings
)

router.get(
  '/:id',
  validateParams(bookingIdParamsSchema),
  getBookingById
)

router.patch(
  '/:id',
  validateParams(bookingIdParamsSchema),
  validate(updateBookingSchema),
  updateBooking
)

router.patch(
  '/:id/confirm',
  validateParams(bookingIdParamsSchema),
  confirmBooking
)

router.patch(
  '/:id/cancel',
  validateParams(bookingIdParamsSchema),
  validate(cancelBookingSchema),
  cancelBooking
)

router.patch(
  '/:id/complete',
  validateParams(bookingIdParamsSchema),
  completeBooking
)

router.delete(
  '/:id',
  validateParams(bookingIdParamsSchema),
  deleteBooking
)

export default router